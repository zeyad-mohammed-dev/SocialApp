import { JwtPayload } from 'jsonwebtoken';
import { HUserDocument } from '../../DB/models/user.model';
import { SignatureLevelEnum } from '../security/token.security';

declare module 'express-serve-static-core' {
  interface Request {
    user?: HUserDocument;
    tokenPayload?: JwtPayload;
    level?: SignatureLevelEnum;
  }
}
