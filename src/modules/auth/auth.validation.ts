import { email, z } from 'zod';
import { generalFields } from '../../middlewares/validation.middleware';

export const login = {
  body: z.strictObject({
    email: generalFields.email,
    password: generalFields.password,
  }),
};

export const signup = {
  body: login.body
    .extend({
      userName: generalFields.userName,
      confirmPassword: generalFields.confirmPassword,
    })
    .superRefine((data, ctx) => {
      if (data.confirmPassword !== data.password) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirmPassword'],
          message: 'Password and Confirm Password do not match',
        });
      }
    }),
};

export const confirmEmail = {
  body: z.strictObject({
    email: generalFields.email,
    otp: generalFields.otp,
  }),
};

export const signupWithGmail = {
  body: z.strictObject({
    idToken: z.string(),
  }),
};

export const sendForgetPasswordCode = {
  body: z.strictObject({
    email: generalFields.email,
  }),
};

export const verifyForgetPasswordCode = {
  body: sendForgetPasswordCode.body.extend({
    otp: generalFields.otp,
  }),
};

export const resetForgetPassword = {
  body: verifyForgetPasswordCode.body
    .extend({
      password: generalFields.password,
      confirmPassword: generalFields.confirmPassword,
    })
    .refine(
      (data) => {
        return data.password === data.confirmPassword;
      },
      {
        message: 'Password and Confirm Password do not match',
        path: ['confirmPassword'],
      }
    ),
};
