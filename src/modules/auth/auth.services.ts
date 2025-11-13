import type { Request, Response } from 'express';
import type { ISignupBodyInputsDTO } from './auth.dto';

class AuthenticationService {
  constructor() {}

  signup = (req: Request, res: Response): Response => {
    let { userName, email, password }: ISignupBodyInputsDTO = req.body;
    return res.status(201).json({ message: 'Done', data: req.body });
  };

  login = (req: Request, res: Response) => {
    res.json({ message: 'Done', data: req.body });
  };
}

export default new AuthenticationService();
