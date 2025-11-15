import * as validators from './auth.validation';
import { validation } from '../../middlewares/validation.middleware';
import authServices from './auth.services';
import { Router } from 'express';
const router = Router();

router.post('/signup', validation(validators.signup), authServices.signup);
router.patch('/confirm-email', validation(validators.confirmEmail), authServices.confirmEmail);
router.post('/login', validation(validators.login), authServices.login);

export default router;
