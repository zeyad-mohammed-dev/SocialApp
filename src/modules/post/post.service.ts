import { Request, Response } from 'express';
import { successResponse } from '../../utils/response/success.response';
import {
  CommentRepository,
  PostRepository,
  UserRepository,
} from '../../DB/repository';
import { UserModel } from '../../DB/models/User.model';
import {
  AvailabilityEnum,
  HPostDocument,
  LikeActionEnum,
  PostModel,
} from '../../DB/models/Post.model';
import {
  BadRequestException,
  NotFoundException,
} from '../../utils/response/error.response';
import { deleteFiles, uploadFiles } from '../../utils/multer/s3.config';
import { v4 as uuid } from 'uuid';
import { LikePostQueryInputsDto } from './post.dto';
import { Types, UpdateQuery } from 'mongoose';
import { CommentModel } from '../../DB';

export const postAvailability = (req: Request) => {
  return [
    { availability: AvailabilityEnum.public },
    { availability: AvailabilityEnum.onlyMe, createdBy: req.user?._id },
    {
      availability: AvailabilityEnum.friends,
      createdBy: { $in: [...(req.user?.friends || []), req.user?._id] },
    },
    {
      availability: { $ne: AvailabilityEnum.onlyMe },
      tags: { $in: req.user?._id },
    },
  ];
};

class PostService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);

  constructor() {}

  createPost = async (req: Request, res: Response): Promise<Response> => {
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
    let assetsFolderId: string = uuid();
    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req.user?._id}/post/${assetsFolderId}`,
      });
    }

    const [post] =
      (await this.postModel.create({
        data: [
          {
            ...req.body,
            attachments,
            assetsFolderId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];

    if (!post) {
      if (attachments?.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException('Failed to create post');
    }

    return successResponse({
      res,
      statusCode: 201,
      message: 'Post created successfully',
      data: {},
    });
  };

  updatePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };

    const post = await this.postModel.findOne({
      filter: { _id: postId, createdBy: req.user?._id },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags, $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotFoundException('One or more tagged users not found');
    }

    let attachments: string[] = [];
    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }

    const updatedPost = await this.postModel.updateOne({
      filter: { _id: post._id },
      update: [
        {
          $set: {
            content: req.body.content,
            allowComments: req.body.allowComments || post.allowComments,
            availability: req.body.availability || post.availability,
            attachments: {
              $setUnion: [
                {
                  $setDifference: [
                    '$attachments',
                    req.body.removedAttachments || [],
                  ],
                },
                attachments,
              ],
            },
            tags: {
              $setUnion: [
                {
                  $setDifference: [
                    '$tags',
                    (req.body.removedTags || []).map((tag: string) => {
                      return Types.ObjectId.createFromHexString(tag);
                    }),
                  ],
                },
                (req.body.tags || []).map((tag: string) => {
                  return Types.ObjectId.createFromHexString(tag);
                }),
              ],
            },
          },
        },
      ],
    });

    if (!updatedPost) {
      if (attachments?.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException('Failed to update post');
    } else {
      if (req.body.removedAttachments?.length) {
        await deleteFiles({ urls: req.body.removedAttachments });
      }
    }

    return successResponse({ res });
  };

  likePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as { postId: string };
    const { action } = req.query as LikePostQueryInputsDto;
    let update: UpdateQuery<HPostDocument> = {
      $addToSet: { likes: req.user?._id },
    };

    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: req.user?._id } };
    }

    const post = await this.postModel.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: postAvailability(req),
      },
      update,
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return successResponse({ res });
  };

  postList = async (req: Request, res: Response): Promise<Response> => {
    let { page, size } = req.query as unknown as {
      page: number;
      size: number;
    };
    const posts = await this.postModel.paginate({
      filter: {
        $or: postAvailability(req),
      },
      options: {
        populate: [
          {
            path: 'comments',
            match: {
              commentId: { $exists: false },
              freezedAt: { $exists: false },
            },
            populate: [
              {
                path: 'reply',
                match: {
                  commentId: { $exists: false },
                  freezedAt: { $exists: false },
                },
                
              },
            ],
          },
        ],
      },
      page,
      size,
    });

    //   const posts = await this.postModel.findCursor({
    //     filter: {
    //       $or: postAvailability(req),
    //     },
    //   });
    return successResponse({ res, data: { posts } });
  };
}

export const postService = new PostService();
