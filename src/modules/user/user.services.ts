import { Request, Response } from 'express';

class UserServices {
  constructor() {}

  profile = async (req: Request, res: Response): Promise<Response> => {
    return res.json({
      message: 'Done',
      data: {
        user: req.user,
        tokenPayload: req.tokenPayload,
        level: req.level,
      },
    });
  };
}

export default new UserServices();
