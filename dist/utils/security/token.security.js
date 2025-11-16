"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoginCredentials = exports.getSignatures = exports.detectSignatureLevel = exports.generateToken = exports.SignatureLevelEnum = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const user_model_1 = require("../../DB/models/user.model");
var SignatureLevelEnum;
(function (SignatureLevelEnum) {
    SignatureLevelEnum["Bearer"] = "Bearer";
    SignatureLevelEnum["System"] = "System";
})(SignatureLevelEnum || (exports.SignatureLevelEnum = SignatureLevelEnum = {}));
const generateToken = async ({ payload, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRED_IN) }, }) => {
    return (0, jsonwebtoken_1.sign)(payload, secret, options);
};
exports.generateToken = generateToken;
const detectSignatureLevel = async (role = user_model_1.RoleEnum.user) => {
    let signatureLevel = SignatureLevelEnum.Bearer;
    switch (role) {
        case user_model_1.RoleEnum.admin:
            signatureLevel = SignatureLevelEnum.System;
            break;
        default:
            signatureLevel = SignatureLevelEnum.Bearer;
            break;
    }
    return signatureLevel;
};
exports.detectSignatureLevel = detectSignatureLevel;
const getSignatures = async (signatureLevel = SignatureLevelEnum.Bearer) => {
    let signatures = {
        access_signature: '',
        refresh_signature: '',
    };
    switch (signatureLevel) {
        case SignatureLevelEnum.System:
            signatures.access_signature = process.env
                .ACCESS_SYSTEM_TOKEN_SIGNATURE;
            signatures.refresh_signature = process.env
                .REFRESH_SYSTEM_TOKEN_SIGNATURE;
            break;
        default:
            signatures.access_signature = process.env
                .ACCESS_USER_TOKEN_SIGNATURE;
            signatures.refresh_signature = process.env
                .REFRESH_USER_TOKEN_SIGNATURE;
            break;
    }
    return signatures;
};
exports.getSignatures = getSignatures;
const createLoginCredentials = async (user) => {
    const signatureLevel = await (0, exports.detectSignatureLevel)(user.role);
    const signatures = await (0, exports.getSignatures)(signatureLevel);
    const access_token = await (0, exports.generateToken)({
        payload: { _id: user._id },
        secret: signatures.access_signature,
        options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
    });
    const refresh_token = await (0, exports.generateToken)({
        payload: { _id: user._id },
        secret: signatures.refresh_signature,
        options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) },
    });
    return { access_token, refresh_token };
};
exports.createLoginCredentials = createLoginCredentials;
