import type { Request, Response } from 'express';
import type { ISignupBodyInputsDTO } from './auth.dto';
import { DatabaseRepository } from '../../DB/repository/database.repository';
import { IUser, UserModel } from '../../DB/models/user.model';
import { BadRequestException } from '../../utils/response/error.response';

class AuthenticationService {
  private userModel = new DatabaseRepository<IUser>(UserModel);
  constructor() {}

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { userName, email, password }: ISignupBodyInputsDTO = req.body;

    const [user] =
      (await this.userModel.create({
        data: [{ userName, email, password }],
        options: { validateBeforeSave: true },
      })) || [];

    if (!user) {
      throw new BadRequestException('Fail to create this user data');
    }

    return res.status(201).json({ message: 'Done', data: { user } });
  };

  login = (req: Request, res: Response) => {
    res.json({ message: 'Done', data: req.body });
  };
}

export default new AuthenticationService();
