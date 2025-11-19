import * as validators from './auth.validation';
import { validation } from '../../middlewares/validation.middleware';
import authServices from './auth.services';
import { Router } from 'express';
const router = Router();

router.post('/signup', validation(validators.signup), authServices.signup);
router.post('/login', validation(validators.login), authServices.login);

router.post('/signup-gmail' , validation(validators.signupWithGmail),authServices.signupWithGmail)
router.post('/login-gmail' , validation(validators.signupWithGmail),authServices.loginWithGmail)

router.patch('/confirm-email', validation(validators.confirmEmail), authServices.confirmEmail);

export default router;
