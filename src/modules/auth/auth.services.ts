import type {Request, Response } from 'express';
import { BadRequestException } from '../../utils/response/error.response';

class AuthenticationService {
  constructor() {}

  signup = (req: Request, res: Response ):Response => {
    throw new BadRequestException("Fail" , {extra : "We...."})
    res.status(201).json({ message: 'Done', data: req.body });
  };

  login = (req: Request, res: Response) => {
    res.json({ message: 'Done', data: req.body });
  };
}

export default new AuthenticationService();
