import { z } from 'zod';
import * as validators from './auth.validation';

export type ISignupBodyInputsDTO = z.infer<typeof validators.signup.body>;
export type ILoginBodyInputsDTO = z.infer<typeof validators.login.body>;

export type IGmailBodyInputsDTO = z.infer<typeof validators.signupWithGmail.body>;

export type IConfirmEmailBodyInputsDTO = z.infer<typeof validators.confirmEmail.body>;
export type IForgetCodeBodyInputsDTO = z.infer<typeof validators.sendForgetPasswordCode.body>;
export type IVerifyForgetPasswordCodeBodyInputsDTO = z.infer<typeof validators.verifyForgetPasswordCode.body>;
export type IResetForgetPasswordBodyInputsDTO = z.infer<typeof validators.resetForgetPassword.body>;




 