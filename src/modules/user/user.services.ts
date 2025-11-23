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
import {
  uploadFile,
  uploadFiles,
  uploadLargeFile,
} from '../../utils/multer/s3.config';
import { StorageEnum } from '../../utils/multer/cloud.multer';

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

  profileImage = async (req: Request, res: Response): Promise<Response> => {
    const key = await uploadLargeFile({
      storageApproach: StorageEnum.disk,
      file: req.file as Express.Multer.File,
      path: `users/${req.tokenPayload?._id}`,
    });
    return res.json({
      message: 'Done',
      data: {
        key,
      },
    });
  };

  profileCoverImage = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const urls = await uploadFiles({
      storageApproach: StorageEnum.disk,
      files: req.files as Express.Multer.File[],
      path: `users/${req.tokenPayload?._id}/cover`,
      useLarge: true,
    });
    return res.json({
      message: 'Done',
      data: {
        urls,
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
