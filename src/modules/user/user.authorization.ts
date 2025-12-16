import { RoleEnum } from '../../DB/models/User.model';

export const endpoint = {
  profile: [RoleEnum.user],
  restoreAccount: [RoleEnum.admin],
  hardDeleteAccount: [RoleEnum.admin],
  dashboard: [RoleEnum.admin, RoleEnum.superAdmin],
  changeRole: [RoleEnum.admin, RoleEnum.superAdmin],
};
