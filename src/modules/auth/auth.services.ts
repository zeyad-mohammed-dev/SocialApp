import type { Request, Response } from 'express';

class AuthenticationService {
  constructor() {}

  signup = (req: Request, res: Response) => {
    res.status(201).json({ message: 'Done', data: req.body });
  };

  login = (req: Request, res: Response) => {
    res.json({ message: 'Done', data: req.body });
  };
}

export default new AuthenticationService();
