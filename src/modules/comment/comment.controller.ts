import { Router } from 'express';
import { authentication } from '../../middlewares/authentication.middleware';
import {
  couldFileUpload,
  fileValidation,
} from '../../utils/multer/cloud.multer';
import commentService from './comment.service';
import * as validators from './comment.validation';
import { validation } from '../../middlewares';

const router = Router({ mergeParams: true });

router.post(
  '/',
  authentication(),
  couldFileUpload({ validation: fileValidation.image }).array('attachments', 2),
  validation(validators.createComment),
  commentService.createComment
);

export default router;
