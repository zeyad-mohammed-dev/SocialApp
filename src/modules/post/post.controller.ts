import postService from './post.service';
import { authentication } from '../../middlewares/authentication.middleware';
import { Router } from 'express';

const router = Router();

router.post('create-post', authentication(), postService.createPost);

export default router;
