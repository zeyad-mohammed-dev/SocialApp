import type { Request, Response } from 'express';
import type { ISignupBodyInputsDTO } from './auth.dto';
import { UserModel } from '../../DB/models/user.model';
import { UserRepository } from '../../DB/repository/user.repository';
import { ConflictException } from '../../utils/response/error.response';
import { generateHash } from '../../utils/security/hash.security';

class AuthenticationService {
  private userModel = new UserRepository(UserModel);
  constructor() {}

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { userName, email, password }: ISignupBodyInputsDTO = req.body;

    const checkUserExist = await this.userModel.findOne({
    filter:{email},
    select:"email",
    options:{lean :true},
  });

  if(checkUserExist){
    throw new ConflictException("Email exist")
  }
    const user = await this.userModel.createUser({
      data: [{ userName, email, password :await generateHash(password) }],
    });

    return res.status(201).json({ message: 'Done', data: { user } });
  };

  login = (req: Request, res: Response) => {
    res.json({ message: 'Done', data: req.body });
  };
}

export default new AuthenticationService();
