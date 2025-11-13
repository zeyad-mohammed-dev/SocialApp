import type {Request, Response } from 'express';
import { BadRequestException } from '../../utils/response/error.response';
import type{ ISignupBodyInputsDTO } from './auth.dto';

class AuthenticationService {
  constructor() {}

  signup = (req: Request, res: Response ):Response => {
    let {name , email}:ISignupBodyInputsDTO = req.body
    console.log({name , email});
    return res.status(201).json({ message: 'Done', data: req.body });
  };

  login = (req: Request, res: Response) => {
    res.json({ message: 'Done', data: req.body });
  };
}

export default new AuthenticationService();
