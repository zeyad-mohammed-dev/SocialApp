"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorization = exports.authentication = void 0;
const error_response_1 = require("../utils/response/error.response");
const token_security_1 = require("../utils/security/token.security");
const authentication = (tokenType = token_security_1.TokenEnum.access) => {
    return async (req, res, next) => {
        if (!req.headers.authorization) {
            throw new error_response_1.UnauthorizedException('Missing authorization header', {
                key: 'header',
                issue: [
                    {
                        path: 'authorization',
                        message: 'Authorization header is required',
                    },
                ],
            });
        }
        const { user, tokenPayload, level } = await (0, token_security_1.decodeToken)({
            authorization: req.headers.authorization,
            tokenType,
        });
        req.user = user;
        req.tokenPayload = tokenPayload;
        req.level = level;
        next();
    };
};
exports.authentication = authentication;
const authorization = (accessRoles = [], tokenType = token_security_1.TokenEnum.access) => {
    return async (req, res, next) => {
        if (!req.headers.authorization) {
            throw new error_response_1.UnauthorizedException('Missing authorization header', {
                key: 'header',
                issue: [
                    {
                        path: 'authorization',
                        message: 'Authorization header is required',
                    },
                ],
            });
        }
        const { user, tokenPayload, level } = await (0, token_security_1.decodeToken)({
            authorization: req.headers.authorization,
            tokenType,
        });
        if (!accessRoles.includes(user.role)) {
            throw new error_response_1.ForbiddenException('Not authorized account');
        }
        req.user = user;
        req.tokenPayload = tokenPayload;
        req.level = level;
        next();
    };
};
exports.authorization = authorization;
