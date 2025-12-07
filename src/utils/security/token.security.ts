import { v4 as uuid } from 'uuid';
import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { decode, sign, verify } from 'jsonwebtoken';
import { HUserDocument, RoleEnum, UserModel } from '../../DB/models/User.model';
import {
  BadRequestException,
  UnauthorizedException,
} from '../response/error.response';
import { UserRepository, TokenRepository } from '../../DB/repository';
import { HTokenDocument, TokenModel } from '../../DB/models/Token.model';

export enum SignatureLevelEnum {
  Bearer = 'Bearer',
  System = 'System',
}

export enum TokenEnum {
  access = 'access',
  refresh = 'refresh',
}
export enum LogoutEnum {
  only = 'only',
  all = 'all',
}

export const generateToken = async ({
  payload,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
  options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRED_IN) },
}: {
  payload: object;
  secret?: Secret;
  options?: SignOptions;
}): Promise<string> => {
  return sign(payload, secret, options);
};

export const verifyToken = async ({
  token,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
}: {
  token: string;
  secret?: Secret;
}): Promise<JwtPayload> => {
  return verify(token, secret) as JwtPayload;
};

export const detectSignatureLevel = async (
  role: RoleEnum = RoleEnum.user
): Promise<SignatureLevelEnum> => {
  let signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer;

  switch (role) {
    case RoleEnum.admin:
      signatureLevel = SignatureLevelEnum.System;
      break;

    default:
      signatureLevel = SignatureLevelEnum.Bearer;
      break;
  }

  return signatureLevel;
};

export const getSignatures = async (
  signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer
): Promise<{ access_signature: string; refresh_signature: string }> => {
  let signatures: { access_signature: string; refresh_signature: string } = {
    access_signature: '',
    refresh_signature: '',
  };

  switch (signatureLevel) {
    case SignatureLevelEnum.System:
      signatures.access_signature = process.env
        .ACCESS_SYSTEM_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env
        .REFRESH_SYSTEM_TOKEN_SIGNATURE as string;
      break;
    default:
      signatures.access_signature = process.env
        .ACCESS_USER_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env
        .REFRESH_USER_TOKEN_SIGNATURE as string;

      break;
  }
  return signatures;
};

export const createLoginCredentials = async (user: HUserDocument) => {
  const signatureLevel = await detectSignatureLevel(user.role);
  const signatures = await getSignatures(signatureLevel);

  const jwtid = uuid();

  const access_token = await generateToken({
    payload: { _id: user._id, lvl: signatureLevel },
    secret: signatures.access_signature,
    options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN), jwtid },
  });
  const refresh_token = await generateToken({
    payload: { _id: user._id, lvl: signatureLevel },
    secret: signatures.refresh_signature,
    options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN), jwtid },
  });

  return { access_token, refresh_token };
};

export const decodeToken = async ({
  authorization,
  tokenType = TokenEnum.access,
}: {
  authorization: string;
  tokenType?: TokenEnum;
}) => {
  const userModel = new UserRepository(UserModel);
  const tokenModel = new TokenRepository(TokenModel);

  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) {
    throw new UnauthorizedException('Missing token parts');
  }

  if (scheme !== 'Bearer') {
    throw new UnauthorizedException('Invalid authorization scheme');
  }

  const decoded = decode(token) as JwtPayload;

  if (!decoded) {
    throw new UnauthorizedException('Invalid token payload');
  }
  const lvl = decoded.lvl || SignatureLevelEnum.Bearer;

  const signatures = await getSignatures(lvl as SignatureLevelEnum);

  const secret =
    tokenType === TokenEnum.refresh
      ? signatures.refresh_signature
      : signatures.access_signature;

  const verification = await verifyToken({ token, secret });

  if (!verification || !verification._id || !verification.iat) {
    throw new UnauthorizedException('Invalid or expired token');
  }

  if (await tokenModel.findOne({ filter: { jti: verification.jti } })) {
    throw new UnauthorizedException('invalid or old login credentials');
  }

  const user = await userModel.findOne({
    filter: { _id: verification._id },
  });

  if (!user) {
    throw new BadRequestException('Not registered account');
  }

  if ((user.changeCredentialsTime?.getTime() || 0) > verification.iat * 1000) {
    throw new UnauthorizedException('invalid or old login credentials');
  }

  return {
    user,
    tokenPayload: verification,
    level: lvl,
  };
};

export const createRevokedToken = async (
  tokenPayload: JwtPayload
): Promise<HTokenDocument> => {
  const tokenModel = new TokenRepository(TokenModel);

  const [result] =
    (await tokenModel.create({
      data: [
        {
          jti: tokenPayload.jti as string,
          expiresIn:
            (tokenPayload.iat as number) +
            Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
          userId: tokenPayload._id,
        },
      ],
    })) || [];

  if (!result) {
    throw new BadRequestException('Failed to revoke token');
  }

  return result;
};
