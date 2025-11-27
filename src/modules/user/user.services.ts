import { HUserDocument, RoleEnum, UserModel } from '../../DB/models/User.model';
import { Request, Response } from 'express';
import {
  IFreezeAccountParamsInputsDTO,
  IHardDeleteAccountParamsInputsDTO,
  ILogoutBodyInputsDTO,
  IRestoreAccountParamsInputsDTO,
} from './user.dto';
import { IUser } from '../../DB/models/User.model';
import { Types, UpdateQuery } from 'mongoose';
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
  createPreSignedUploadLink,
  deleteFiles,
  deleteFolderByPrefix,
  uploadFile,
  uploadFiles,
  uploadLargeFile,
} from '../../utils/multer/s3.config';
import { StorageEnum } from '../../utils/multer/cloud.multer';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../utils/response/error.response';
import { s3Event } from '../../utils/event/s3.event';

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

  freezeAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = (req.params as IFreezeAccountParamsInputsDTO) || {};
    if (userId && req.user?.role !== RoleEnum.admin) {
      throw new ForbiddenException('not authorized user');
    }

    const user = await this.userModel.updateOne({
      filter: { _id: userId || req.user?._id, freezedAt: { $exists: false } },
      update: {
        freezedAt: new Date(),
        freezedBy: req.user?._id,
        changeCredentialsTime: new Date(),
        $unset: { restoredAt: 1, restoredBy: 1 },
      },
    });

    if (!user.modifiedCount) {
      throw new NotFoundException('user not found or already freezed');
    }

    return res.json({ message: 'Done' });
  };

  restoreAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as IRestoreAccountParamsInputsDTO;

    const user = await this.userModel.updateOne({
      filter: { _id: userId, freezedBy: { $ne: userId } },
      update: {
        restoredAt: new Date(),
        restoredBy: req.user?._id,
        $unset: { freezedAt: 1, freezedBy: 1 },
      },
    });

    if (!user.modifiedCount) {
      throw new NotFoundException('user not found or freezed by account owner');
    }

    return res.json({ message: 'Done' });
  };

  hardDeleteAccount = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { userId } = req.params as IHardDeleteAccountParamsInputsDTO;

    const user = await this.userModel.deleteOne({
      filter: { _id: userId, freezedAt: { $exists: true } },
    });

    if (!user.deletedCount) {
      throw new NotFoundException('user not found or not freezed');
    }

    await deleteFolderByPrefix({ path: `users/${userId}` });

    return res.json({ message: 'Done' });
  };

  profileImage = async (req: Request, res: Response): Promise<Response> => {
    const {
      ContentType,
      OriginalName,
    }: { ContentType: string; OriginalName: string } = req.body;

    const { url, key } = await createPreSignedUploadLink({
      ContentType,
      OriginalName,
      path: `users/${req.tokenPayload?._id}`,
    });

    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: { profileImage: key, temProfileImage: req.user?.profileImage },
    });

    if (!user) {
      throw new BadRequestException('fail to update user profile image');
    }

    s3Event.emit('trackProfileImage', {
      userId: req.user?._id,
      oldKey: req.user?.profileImage,
      key,
      expiresIn: 60000,
    });

    return res.json({
      message: 'Done',
      data: {
        url,
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

    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        coverImages: urls,
      },
    });

    if (!user) {
      throw new BadRequestException('fail to update user cover images');
    }

    if (req.user?.coverImages) {
      await deleteFiles({ urls: req.user.coverImages });
    }

    return res.status(200).json({
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
