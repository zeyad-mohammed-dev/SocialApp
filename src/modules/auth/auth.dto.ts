import { z } from 'zod';
import * as validators from './auth.validation';
export type ISignupBodyInputsDTO = z.infer<typeof validators.signup.body>;
