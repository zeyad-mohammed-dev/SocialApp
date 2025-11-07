import authServices from './auth.services';
import { Router } from 'express';
const router = Router();

router.post('/signup', authServices.signup);
router.post('/login', authServices.login);

export default router;
