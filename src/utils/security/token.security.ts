import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { decode, sign, verify } from 'jsonwebtoken';
import { HUserDocument, RoleEnum, UserModel } from '../../DB/models/user.model';
import {
  BadRequestException,
  UnauthorizedException,
} from '../response/error.response';
import { UserRepository } from '../../DB/repository/user.repository';

export enum SignatureLevelEnum {
  Bearer = 'Bearer',
  System = 'System',
}

export enum TokenEnum {
  access = 'access',
  refresh = 'refresh',
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
  const access_token = await generateToken({
    payload: { _id: user._id, lvl: signatureLevel },
    secret: signatures.access_signature,
    options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
  });
  const refresh_token = await generateToken({
    payload: { _id: user._id, lvl: signatureLevel },
    secret: signatures.refresh_signature,
    options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) },
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

  const [bearerKey, token] = authorization.split(' ');
  if (!bearerKey || !token) {
    throw new UnauthorizedException('Missing token parts');
  }

  if (bearerKey !== 'Bearer') {
    throw new UnauthorizedException('Invalid authorization bearerKey');
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

  if (!verification || !verification._id) {
    throw new UnauthorizedException('Invalid or expired token');
  }

  const user = await userModel.findOne({
    filter: { _id: verification._id },
  });

  if (!user) {
    throw new BadRequestException('Not registered account');
  }

  return {
    user,
    tokenPayload: verification,
    level: lvl,
  };
};
