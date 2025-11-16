"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeToken = exports.createLoginCredentials = exports.getSignatures = exports.detectSignatureLevel = exports.verifyToken = exports.generateToken = exports.TokenEnum = exports.SignatureLevelEnum = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const user_model_1 = require("../../DB/models/user.model");
const error_response_1 = require("../response/error.response");
const user_repository_1 = require("../../DB/repository/user.repository");
var SignatureLevelEnum;
(function (SignatureLevelEnum) {
    SignatureLevelEnum["Bearer"] = "Bearer";
    SignatureLevelEnum["System"] = "System";
})(SignatureLevelEnum || (exports.SignatureLevelEnum = SignatureLevelEnum = {}));
var TokenEnum;
(function (TokenEnum) {
    TokenEnum["access"] = "access";
    TokenEnum["refresh"] = "refresh";
})(TokenEnum || (exports.TokenEnum = TokenEnum = {}));
const generateToken = async ({ payload, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRED_IN) }, }) => {
    return (0, jsonwebtoken_1.sign)(payload, secret, options);
};
exports.generateToken = generateToken;
const verifyToken = async ({ token, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, }) => {
    return (0, jsonwebtoken_1.verify)(token, secret);
};
exports.verifyToken = verifyToken;
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
        payload: { _id: user._id, lvl: signatureLevel },
        secret: signatures.access_signature,
        options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
    });
    const refresh_token = await (0, exports.generateToken)({
        payload: { _id: user._id, lvl: signatureLevel },
        secret: signatures.refresh_signature,
        options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) },
    });
    return { access_token, refresh_token };
};
exports.createLoginCredentials = createLoginCredentials;
const decodeToken = async ({ authorization, tokenType = TokenEnum.access, }) => {
    const userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    const [bearerKey, token] = authorization.split(' ');
    if (!bearerKey || !token) {
        throw new error_response_1.UnauthorizedException('Missing token parts');
    }
    if (bearerKey !== 'Bearer') {
        throw new error_response_1.UnauthorizedException('Invalid authorization bearerKey');
    }
    const decoded = (0, jsonwebtoken_1.decode)(token);
    if (!decoded) {
        throw new error_response_1.UnauthorizedException('Invalid token payload');
    }
    const lvl = decoded.lvl || SignatureLevelEnum.Bearer;
    const signatures = await (0, exports.getSignatures)(lvl);
    const secret = tokenType === TokenEnum.refresh
        ? signatures.refresh_signature
        : signatures.access_signature;
    const verification = await (0, exports.verifyToken)({ token, secret });
    if (!verification || !verification._id) {
        throw new error_response_1.UnauthorizedException('Invalid or expired token');
    }
    const user = await userModel.findOne({
        filter: { _id: verification._id },
    });
    if (!user) {
        throw new error_response_1.BadRequestException('Not registered account');
    }
    return {
        user,
        tokenPayload: verification,
        level: lvl,
    };
};
exports.decodeToken = decodeToken;
