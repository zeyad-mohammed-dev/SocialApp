import * as validators from './auth.validation';
import { validation } from '../../middlewares/validation.middleware';
import authServices from './auth.services';
import { Router } from 'express';
const router = Router();

router.post('/signup', authServices.signup);
router.post('/login', authServices.login);

export default router;
