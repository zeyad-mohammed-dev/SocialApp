"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../DB/models/User.model");
const token_security_1 = require("../../utils/security/token.security");
const user_repository_1 = require("../../DB/repository/user.repository");
const token_repository_1 = require("../../DB/repository/token.repository");
const Token_model_1 = require("../../DB/models/Token.model");
class UserServices {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    tokenModel = new token_repository_1.TokenRepository(Token_model_1.TokenModel);
    constructor() { }
    profile = async (req, res) => {
        return res.json({
            message: 'Done',
            data: {
                user: req.user,
                tokenPayload: req.tokenPayload,
                level: req.level,
            },
        });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        let statusCode = 200;
        const update = {};
        switch (flag) {
            case token_security_1.LogoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokedToken)(req.tokenPayload);
                statusCode = 201;
                break;
        }
        await this.userModel.updateOne({
            filter: { _id: req.tokenPayload?._id },
            update,
        });
        return res.status(statusCode).json({
            message: 'Done',
        });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokedToken)(req.tokenPayload);
        return res.status(201).json({ message: 'Done', data: { credentials } });
    };
}
exports.default = new UserServices();
