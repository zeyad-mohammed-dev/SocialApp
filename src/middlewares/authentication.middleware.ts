import { NextFunction, Request, Response } from 'express';
import {
  ForbiddenException,
  UnauthorizedException,
} from '../utils/response/error.response';
import { decodeToken, TokenEnum } from '../utils/security/token.security';
import { RoleEnum } from '../DB/models/user.model';

export const authentication = (tokenType: TokenEnum = TokenEnum.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new UnauthorizedException('Missing authorization header', {
        key: 'header',
        issue: [
          {
            path: 'authorization',
            message: 'Authorization header is required',
          },
        ],
      });
    }
    const { user, tokenPayload, level } = await decodeToken({
      authorization: req.headers.authorization,
      tokenType,
    });

    req.user = user;
    req.tokenPayload = tokenPayload;
    req.level = level;
    next();
  };
};

export const authorization = (
  accessRoles: RoleEnum[] = [],
  tokenType: TokenEnum = TokenEnum.access
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new UnauthorizedException('Missing authorization header', {
        key: 'header',
        issue: [
          {
            path: 'authorization',
            message: 'Authorization header is required',
          },
        ],
      });
    }
    const { user, tokenPayload, level } = await decodeToken({
      authorization: req.headers.authorization,
      tokenType,
    });

    if (!accessRoles.includes(user.role)) {
      throw new ForbiddenException('Not authorized account');
    }

    req.user = user;
    req.tokenPayload = tokenPayload;
    req.level = level;
    next();
  };
};
