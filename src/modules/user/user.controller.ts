import { Router } from 'express';
import userServices from './user.services';
import { authentication } from '../../middlewares/authentication.middleware';
const router = Router();

router.get('/', authentication(), userServices.profile);

export default router;
