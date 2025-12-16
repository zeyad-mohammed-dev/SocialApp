import { fileValidation, StorageEnum } from './../../utils/multer/cloud.multer';
import { Router } from 'express';
import userServices from './user.service';
import {
  authentication,
  authorization,
} from '../../middlewares/authentication.middleware';
import { validation } from '../../middlewares/validation.middleware';
import * as validators from './user.validation';
import { TokenEnum } from '../../utils/security/token.security';
import { couldFileUpload } from '../../utils/multer/cloud.multer';
import { endpoint } from './user.authorization';

const router = Router();

router.get('/', authentication(), userServices.profile);

router.get(
  '/dashboard',
  authorization(endpoint.dashboard),
  userServices.dashboard
);

router.post(
  '/:userId/send-friend-request',
  authentication(),
  validation(validators.sendFriendRequest),
  userServices.sendFriendRequest
);

router.post(
  '/accept-friend-request/:friendRequestId',
  authentication(),
  validation(validators.acceptFriendRequest),
  userServices.acceptFriendRequest
);

router.patch(
  '/:userId/change-role',
  authorization(endpoint.changeRole),
  validation(validators.changeRole),
  userServices.changeRole
);

router.post(
  '/refresh-token',
  authentication(TokenEnum.refresh),
  userServices.refreshToken
);
router.post(
  '/logout',
  authentication(),
  validation(validators.logout),
  userServices.logout
);

router.patch('/profile-image', authentication(), userServices.profileImage);
router.patch(
  '/profile-cover-image',
  authentication(),
  couldFileUpload({
    validation: fileValidation.image,
    storageApproach: StorageEnum.disk,
  }).array('images', 2),
  userServices.profileCoverImage
);

router.delete(
  '/freeze-account{/:userId}',
  authentication(),
  validation(validators.freezeAccount),
  userServices.freezeAccount
);

router.delete(
  '/hard-delete-account/:userId',
  authorization(endpoint.hardDeleteAccount),
  validation(validators.hardDeleteAccount),
  userServices.hardDeleteAccount
);

router.patch(
  '/restore-account/:userId',
  authorization(endpoint.hardDeleteAccount),
  validation(validators.restoreAccount),
  userServices.restoreAccount
);

export default router;
