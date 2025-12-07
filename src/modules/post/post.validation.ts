import z from 'zod';
import {
  AllowCommentsEnum,
  AvailabilityEnum,
} from '../../DB/models/Post.model';
import { generalFields } from '../../middlewares/validation.middleware';
import { fileValidation } from '../../utils/multer/cloud.multer';
import { Types } from 'mongoose';

export const createPost = {
  body: z
    .strictObject({
      content: z.string().min(2).max(500000).optional(),
      attachments: z
        .array(generalFields.file(fileValidation.image))
        .max(2)
        .optional(),
      availability: z.enum(AvailabilityEnum).default(AvailabilityEnum.public),
      allowComments: z.enum(AllowCommentsEnum).default(AllowCommentsEnum.allow),
      tags: z.array(generalFields.id).max(10).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.attachments?.length && !data.content) {
        ctx.addIssue({
          code: 'custom',
          path: ['content'],
          message: 'Either content or attachments must be provided',
        });
      }

      if (
        data.tags?.length &&
        data.tags.length !== [...new Set(data.tags)].length
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['tags'],
          message: 'Duplicated tagged users',
        });
      }
    }),
};
