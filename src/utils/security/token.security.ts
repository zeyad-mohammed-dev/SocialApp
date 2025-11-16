import type { Secret, SignOptions } from 'jsonwebtoken';
import { sign } from 'jsonwebtoken';
import { HUserDocument, RoleEnum } from '../../DB/models/user.model';

export enum SignatureLevelEnum {
  Bearer = 'Bearer',
  System = 'System',
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
    payload: { _id: user._id },
    secret: signatures.access_signature,
    options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
  });
  const refresh_token = await generateToken({
    payload: { _id: user._id },
    secret: signatures.refresh_signature,
    options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) },
  });

  return { access_token, refresh_token };
};
