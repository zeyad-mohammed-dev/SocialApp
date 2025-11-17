import { Router } from 'express';
import userServices from './user.services';
import { authentication } from '../../middlewares/authentication.middleware';
import { validation } from '../../middlewares/validation.middleware';
import * as validators from './user.validation';
import { TokenEnum } from '../../utils/security/token.security';

const router = Router();

router.get('/', authentication(), userServices.profile);
router.post('/refresh-token', authentication(TokenEnum.refresh), userServices.refreshToken);
router.post('/logout', authentication(),validation(validators.logout), userServices.logout);

export default router;
