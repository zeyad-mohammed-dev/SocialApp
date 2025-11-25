import { fileValidation, StorageEnum } from './../../utils/multer/cloud.multer';
import { Router } from 'express';
import userServices from './user.services';
import { authentication } from '../../middlewares/authentication.middleware';
import { validation } from '../../middlewares/validation.middleware';
import * as validators from './user.validation';
import { TokenEnum } from '../../utils/security/token.security';
import { couldFileUpload } from '../../utils/multer/cloud.multer';

const router = Router();

router.get('/', authentication(), userServices.profile);

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

router.patch(
  '/profile-image',
  authentication(),
  userServices.profileImage
);

router.patch(
  '/profile-cover-image',
  authentication(),
  couldFileUpload({
    validation: fileValidation.image,
    storageApproach: StorageEnum.disk,
  }).array('images', 2),
  userServices.profileCoverImage
);

export default router;
