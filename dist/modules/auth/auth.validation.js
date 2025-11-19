"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetForgetPassword = exports.verifyForgetPasswordCode = exports.sendForgetPasswordCode = exports.signupWithGmail = exports.confirmEmail = exports.signup = exports.login = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
exports.login = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
    }),
};
exports.signup = {
    body: exports.login.body
        .extend({
        userName: validation_middleware_1.generalFields.userName,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
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
exports.confirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        otp: validation_middleware_1.generalFields.otp,
    }),
};
exports.signupWithGmail = {
    body: zod_1.z.strictObject({
        idToken: zod_1.z.string(),
    }),
};
exports.sendForgetPasswordCode = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
    }),
};
exports.verifyForgetPasswordCode = {
    body: exports.sendForgetPasswordCode.body.extend({
        otp: validation_middleware_1.generalFields.otp,
    }),
};
exports.resetForgetPassword = {
    body: exports.verifyForgetPasswordCode.body
        .extend({
        password: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
    })
        .refine((data) => {
        return data.password === data.confirmPassword;
    }, {
        message: 'Password and Confirm Password do not match',
        path: ['confirmPassword'],
    }),
};
