import type { Request, Response } from 'express';
import type {
  IConfirmEmailBodyInputsDTO,
  ILoginBodyInputsDTO,
  ISignupBodyInputsDTO,
} from './auth.dto';
import { UserModel } from '../../DB/models/User.model';
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

class AuthenticationService {
  private userModel = new UserRepository(UserModel);
  constructor() {}

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
      filter: { email },
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
