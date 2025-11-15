import { z } from 'zod';
import * as validators from './auth.validation';

export type ISignupBodyInputsDTO = z.infer<typeof validators.signup.body>;
export type ILoginBodyInputsDTO = z.infer<typeof validators.login.body>;
export type IConfirmEmailBodyInputsDTO = z.infer<typeof validators.confirmEmail.body>;

