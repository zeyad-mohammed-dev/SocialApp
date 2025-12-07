import { Request, Response } from 'express';
import { successResponse } from '../../utils/response/success.response';
import { PostRepository, UserRepository } from '../../DB/repository';
import { UserModel } from '../../DB/models/User.model';
import { PostModel } from '../../DB/models/Post.model';

class PostService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  constructor() {}

  createPost = async (req: Request, res: Response): Promise<Response> => {
    return successResponse({
      res,
      statusCode: 201,
      message: 'Post created successfully',
      data: {},
    });
  };
}

export default new PostService();
