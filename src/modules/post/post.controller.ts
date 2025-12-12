import {postService} from './post.service';
import { validation } from '../../middlewares/validation.middleware';
import * as validators from './post.validation';
import { authentication } from '../../middlewares/authentication.middleware';
import {
  couldFileUpload,
  fileValidation,
} from '../../utils/multer/cloud.multer';

import { Router } from 'express';

const router = Router();

router.post(
  '/',
  authentication(),
  couldFileUpload({ validation: fileValidation.image }).array('attachments', 2),
  validation(validators.createPost),
  postService.createPost
);

router.patch(
  '/:postId/like',
  authentication(),
  validation(validators.likePost),
  postService.likePost
);

export default router;
