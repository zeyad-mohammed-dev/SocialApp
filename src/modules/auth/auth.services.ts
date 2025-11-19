import type { Request, Response } from 'express';
import type {
  IConfirmEmailBodyInputsDTO,
  IGmailBodyInputsDTO,
  ILoginBodyInputsDTO,
  ISignupBodyInputsDTO,
} from './auth.dto';
import { ProviderEnum, UserModel } from '../../DB/models/User.model';
import { UserRepository } from '../../DB/repository/user.repository';
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

    return res.status(200).json({ message: 'Done', data: { credentials } });
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

    return res.status(201).json({ message: 'Done', data: { credentials } });
  };

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { userName, email, password }: ISignupBodyInputsDTO = req.body;

    const checkUserExist = await this.userModel.findOne({
      filter: { email },
      select: 'email',
      options: { lean: true },
    });

    if (checkUserExist) {
      throw new ConflictException('Email exist');
    }

    const otp = generateNumberOtp();

    const user = await this.userModel.createUser({
      data: [
        {
          userName,
          email,
          password: await generateHash(password),
          confirmEmailOtp: await generateHash(otp),
        },
      ],
    });

    emailEvent.emit('confirmEmail', { to: email, otp, name: userName });

    return res.status(201).json({ message: 'Done', data: { user } });
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

    return res.json({ message: 'Done' });
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

    return res.json({
      message: 'Done',
      data: { credentials },
    });
  };
}

export default new AuthenticationService();
