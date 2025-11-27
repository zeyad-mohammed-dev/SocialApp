import { z } from 'zod';
import {
  freezeAccount,
  hardDeleteAccount,
  logout,
  restoreAccount,
} from './user.validation';

export type ILogoutBodyInputsDTO = z.infer<typeof logout.body>;

export type IFreezeAccountParamsInputsDTO = z.infer<
  typeof freezeAccount.params
>;

export type IRestoreAccountParamsInputsDTO = z.infer<
  typeof restoreAccount.params
>;

export type IHardDeleteAccountParamsInputsDTO = z.infer<
  typeof hardDeleteAccount.params
>;
