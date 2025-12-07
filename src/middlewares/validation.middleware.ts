import { file, z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodType } from 'zod';
import { BadRequestException } from '../utils/response/error.response';
import { Types } from 'mongoose';

type KeyReqType = keyof Request;

type SchemaType = Partial<Record<KeyReqType, ZodType>>;

type validationErrorsType = Array<{
  key: KeyReqType;
  issues: Array<{
    message: string;
    path: (string | number | symbol | undefined)[];
  }>;
}>;

export const validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction => {
    const validationErrors: validationErrorsType = [];
    for (const key of Object.keys(schema) as KeyReqType[]) {
      if (!schema[key]) continue;

      if (req.file) {
        req.body.attachment = req.file;
      }
      if (req.files) {
        console.log(req.files);
        req.body.attachments = req.files;
      }

      const validationResult = schema[key].safeParse(req[key]);

      if (!validationResult.success) {
        const errors = validationResult.error as ZodError;

        validationErrors.push({
          key,
          issues: errors.issues.map((issue) => {
            return { message: issue.message, path: issue.path };
          }),
        });
      }
    }

    if (validationErrors.length) {
      throw new BadRequestException('Validation Error', {
        validationErrors,
      });
    }

    return next() as unknown as NextFunction;
  };
};

export const generalFields = {
  username: z
    .string({ error: 'username is required ' })
    .min(2, { error: 'min username length is 2 char' })
    .max(20, { error: 'max username length is 20 char' }),
  email: z.email({ error: 'valid email must be like to example@domain.com' }),
  password: z
    .string()
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
  confirmPassword: z.string(),
  otp: z.string().regex(/^[0-9]{6}$/, 'Invalid OTP format'),

  file: function (mimetype: string[]) {
    return z
      .strictObject({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.enum(mimetype),
        buffer: z.string().optional(),
        path: z.string().optional(),
        size: z.number(),
      })
      .refine(
        (data) => {
          return data.buffer || data.path;
        },
        { error: 'File must have either buffer or path', path: ['file'] }
      );
  },

  id: z.string().refine(
    (data) => {
      return Types.ObjectId.isValid(data);
    },
    { error: 'Invalid tag ID' }
  ),
};
