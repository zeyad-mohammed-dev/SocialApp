import { Request, Response } from 'express';
import {
  AllowCommentsEnum,
  CommentModel,
  CommentRepository,
  HPostDocument,
  PostModel,
  PostRepository,
  UserModel,
  UserRepository,
} from '../../DB';
import {
  BadRequestException,
  deleteFiles,
  NotFoundException,
  StorageEnum,
  successResponse,
  uploadFiles,
} from '../../utils';
import { postAvailability } from '../post';
import { Types } from 'mongoose';

class CommentService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  private commentModel = new CommentRepository(CommentModel);
  constructor() {}

  createComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        allowComments: AllowCommentsEnum.allow,
        $or: postAvailability(req),
      },
    });

    if (!post) {
      throw new NotFoundException('fail to find matching result');
    }
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags, $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotFoundException(
        'One or more tagged users not found or you try to tag your self'
      );
    }

    let attachments: string[] = [];
    if (req.files?.length) {
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        path: `users/${post.createdBy}/post/${post.assetsFolderId}/comments`,
        files: req.files as Express.Multer.File[],
      });
    }

    const [comment] =
      (await this.commentModel.create({
        data: [
          {
            ...req.body,
            attachments,
            postId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];

    if (!comment) {
      if (attachments?.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException('Failed to create comment');
    }

    return successResponse({ res, statusCode: 201 });
  };

  replyOnComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId } = req.params as unknown as {
      postId: Types.ObjectId;
      commentId: Types.ObjectId;
    };
    const comment = await this.commentModel.findOne({
      filter: {
        _id: commentId,
        postId,
      },
      options: {
        populate: [
          {
            path: 'postId',
            match: {
              allowComments: AllowCommentsEnum.allow,
              $or: postAvailability(req),
            },
          },
        ],
      },
    });

    if (!comment?.postId) {
      throw new NotFoundException('fail to find matching result');
    }
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags, $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotFoundException(
        'One or more tagged users not found or you try to tag your self'
      );
    }

    let attachments: string[] = [];
    if (req.files?.length) {
      const post = comment.postId as Partial<HPostDocument>;
      attachments = await uploadFiles({
        storageApproach: StorageEnum.memory,
        path: `users/${post.createdBy}/post/${post.assetsFolderId}/comments`,
        files: req.files as Express.Multer.File[],
      });
    }

    const [reply] =
      (await this.commentModel.create({
        data: [
          {
            ...req.body,
            attachments,
            postId,
            commentId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];

    if (!reply) {
      if (attachments?.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException('Failed to create reply');
    }

    return successResponse({ res, statusCode: 201 });
  };
}

export default new CommentService();
