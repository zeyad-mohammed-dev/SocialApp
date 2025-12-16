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
import {
  UserRepository,
  TokenRepository,
  PostRepository,
} from '../../DB/repository';
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
  UnauthorizedException,
} from '../../utils/response/error.response';
import { s3Event } from '../../utils/event/s3.event';
import { successResponse } from '../../utils/response/success.response';
import {
  IProfileCoverImageResponse,
  IProfileImageResponse,
  IProfileResponse,
  IRefreshTokenResponse,
} from './user.entities';
import { PostModel } from '../../DB';

class UserServices {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);

  private tokenModel = new TokenRepository(TokenModel);
  constructor() {}

  profile = async (req: Request, res: Response): Promise<Response> => {
    if (!req.user) {
      throw new UnauthorizedException('user not authenticated');
    }
    return successResponse<IProfileResponse>({ res, data: { user: req.user } });
  };

  dashboard = async (req: Request, res: Response): Promise<Response> => {
    const result = await Promise.allSettled([
      this.userModel.find({ filter: {} }),
      this.postModel.find({ filter: {} }),
    ]);
    return successResponse({ res, data: { result } });
  };

  changeRole = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };
    const { role }: { role: RoleEnum } = req.body;

    let denyRoles: RoleEnum[] = [role, RoleEnum.superAdmin];

    if (req.user?.role === RoleEnum.admin) {
      denyRoles.push(RoleEnum.admin);
    }

    const user = await this.userModel.findOneAndUpdate({
      filter: { _id: userId as Types.ObjectId, role: { $nin: denyRoles } },
      update: { role },
    });

    if (!user) {
      throw new NotFoundException('user not found');
    }

    return successResponse({ res });
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

    return successResponse({ res });
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

    return successResponse({ res });
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

    return successResponse({ res });
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

    return successResponse<IProfileImageResponse>({ res, data: { url } });
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

    return successResponse<IProfileCoverImageResponse>({ res, data: { user } });
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

    return successResponse({ res, statusCode });
  };

  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const credentials = await createLoginCredentials(req.user as HUserDocument);
    await createRevokedToken(req.tokenPayload as JwtPayload);
    return successResponse<IRefreshTokenResponse>({
      res,
      statusCode: 201,
      data: { credentials },
    });
  };
}

export default new UserServices();
