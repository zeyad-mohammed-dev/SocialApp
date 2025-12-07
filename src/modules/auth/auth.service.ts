import type { Request, Response } from 'express';
import type {
  IConfirmEmailBodyInputsDTO,
  IForgetCodeBodyInputsDTO,
  IGmailBodyInputsDTO,
  ILoginBodyInputsDTO,
  IResetForgetPasswordBodyInputsDTO,
  ISignupBodyInputsDTO,
  IVerifyForgetPasswordCodeBodyInputsDTO,
} from './auth.dto';

import { ProviderEnum, UserModel } from '../../DB/models/User.model';
import { UserRepository } from '../../DB/repository';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../utils/response/error.response';
import { compareHash, generateHash } from '../../utils/security/hash.security';
import { emailEvent } from '../../utils/event/email.event';
import { generateNumberOtp } from '../../utils/helpers/otp';
import { createLoginCredentials } from '../../utils/security/token.security';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { successResponse } from '../../utils/response/success.response';
import {
  ILoginResponse,
  ILoginWithGmailResponse,
  ISignupWithGmailResponse,
} from './auth.entities';

class AuthenticationService {
  private userModel = new UserRepository(UserModel);
  constructor() {}

  private async verifyGoogleAccount(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_IDs?.split(',') || [],
    });
    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      throw new BadRequestException('Failed to verify Google account');
    }
    return payload;
  }

  loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmailBodyInputsDTO = req.body;
    const { email } = await this.verifyGoogleAccount(idToken);

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.GOOGLE,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No account associated with this Gmail, please signup first'
      );
    }

    const credentials = await createLoginCredentials(user);

    return successResponse<ILoginWithGmailResponse>({
      res,
      data: { credentials },
    });
  };

  signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmailBodyInputsDTO = req.body;
    const { email, given_name, family_name, name, picture } =
      await this.verifyGoogleAccount(idToken);

    const user = await this.userModel.findOne({
      filter: {
        email,
      },
    });

    if (user) {
      if (user.provider === ProviderEnum.GOOGLE) {
        return await this.loginWithGmail(req, res);
      }
      throw new ConflictException(
        `Email exist with another provider ${user.provider} `
      );
    }

    const newUser = await this.userModel.createUser({
      data: [
        {
          email: email as string,
          provider: ProviderEnum.GOOGLE,
          firstName: given_name as string,
          lastName: family_name as string,
          profileImage: picture as string,
          confirmedAt: new Date(),
        },
      ],
    });

    const credentials = await createLoginCredentials(newUser);

    return successResponse<ISignupWithGmailResponse>({
      res,
      statusCode: 201,
      data: { credentials },
    });
  };

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { username, email, password }: ISignupBodyInputsDTO = req.body;

    const checkUserExist = await this.userModel.findOne({
      filter: { email },
      select: 'email',
      options: { lean: true },
    });

    if (checkUserExist) {
      throw new ConflictException('Email exist');
    }

    const otp = generateNumberOtp();

    await this.userModel.createUser({
      data: [
        {
          username,
          email,
          password,
          confirmEmailOtp: otp,
        },
      ],
    });

    return successResponse({ res, statusCode: 201 });
  };

  confirmEmail = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp }: IConfirmEmailBodyInputsDTO = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        confirmEmailOtp: { $exists: true },
        confirmedAt: { $exists: false },
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid email or already confirmed');
    }

    if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
      throw new ConflictException('Invalid OTP');
    }

    await this.userModel.updateOne({
      filter: { email },
      update: {
        confirmedAt: new Date(),
        $unset: { confirmEmailOtp: 1 },
      },
    });

    return successResponse({ res });
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: ILoginBodyInputsDTO = req.body;

    const user = await this.userModel.findOne({
      filter: { email, provider: ProviderEnum.SYSTEM },
    });
    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }
    if (!user.confirmedAt) {
      throw new BadRequestException('Please confirm your email before login');
    }
    if (!(await compareHash(password, user.password))) {
      throw new BadRequestException('Invalid credentials');
    }

    const credentials = await createLoginCredentials(user);

    return successResponse<ILoginResponse>({ res, data: { credentials } });
  };

  sendForgetPasswordCode = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email }: IForgetCodeBodyInputsDTO = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmedAt: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException('No account associated with this email');
    }

    const otp = generateNumberOtp();

    const result = await this.userModel.updateOne({
      filter: { email },
      update: { resetPasswordOTP: await generateHash(String(otp)) },
    });

    if (!result.matchedCount) {
      throw new BadRequestException(
        'Failed to send reset code, please try again'
      );
    }

    console.log(email);
    emailEvent.emit('resetPasswordOTP', {
      to: email,
      otp,
      name: user.username,
    });

    return successResponse({ res });
  };

  verifyForgetPasswordCode = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp }: IVerifyForgetPasswordCodeBodyInputsDTO = req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOTP: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException('No account associated with this email');
    }

    if (!(await compareHash(otp, user.resetPasswordOTP as string))) {
      throw new ConflictException('Invalid OTP');
    }

    return successResponse({ res });
  };

  resetForgetPassword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp, password }: IResetForgetPasswordBodyInputsDTO =
      req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOTP: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException('No account associated with this email');
    }

    if (!(await compareHash(otp, user.resetPasswordOTP as string))) {
      throw new ConflictException('Invalid OTP');
    }

    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        password: await generateHash(password),
        $unset: { resetPasswordOTP: 1 },
        changeCredentialsTime: new Date(),
      },
    });

    if (!result.matchedCount) {
      throw new BadRequestException(
        'Failed to reset password, please try again'
      );
    }

    return successResponse({ res });
  };
}

export default new AuthenticationService();
