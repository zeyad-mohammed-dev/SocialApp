import { z } from 'zod';
import * as validators from './user.validation';

export type ILogoutBodyInputsDTO = z.infer<typeof validators.logout.body>;
