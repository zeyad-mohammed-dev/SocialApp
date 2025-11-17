import { HUserDocument, UserModel } from '../../DB/models/User.model';
import { Request, Response } from 'express';
import { ILogoutBodyInputsDTO } from './user.dto';
import { IUser } from '../../DB/models/User.model';
import { UpdateQuery } from 'mongoose';
import {
  createLoginCredentials,
  createRevokedToken,
  LogoutEnum,
} from '../../utils/security/token.security';
import { UserRepository } from '../../DB/repository/user.repository';
import { TokenRepository } from '../../DB/repository/token.repository';
import { TokenModel } from '../../DB/models/Token.model';
import { JwtPayload } from 'jsonwebtoken';

class UserServices {
  private userModel = new UserRepository(UserModel);
  private tokenModel = new TokenRepository(TokenModel);
  constructor() {}

  profile = async (req: Request, res: Response): Promise<Response> => {
    return res.json({
      message: 'Done',
      data: {
        user: req.user,
        tokenPayload: req.tokenPayload,
        level: req.level,
      },
    });
  };
  logout = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: ILogoutBodyInputsDTO = req.body;
    let statusCode: number = 200;
    const update: UpdateQuery<IUser> = {};
    switch (flag) {
      case LogoutEnum.all:
        update.changeCredentialsTime = new Date();

        break;

      default:
        await createRevokedToken(req.tokenPayload as JwtPayload);
        statusCode = 201;
        break;
    }

    await this.userModel.updateOne({
      filter: { _id: req.tokenPayload?._id },
      update,
    });

    return res.status(statusCode).json({
      message: 'Done',
    });
  };
  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const credentials = await createLoginCredentials(req.user as HUserDocument);
    await createRevokedToken(req.tokenPayload as JwtPayload);
    return res.status(201).json({ message: 'Done', data: { credentials } });
  };
}

export default new UserServices();
