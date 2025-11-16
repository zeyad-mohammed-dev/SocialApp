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
                await this.tokenModel.create({
                    data: [
                        {
                            jti: req.tokenPayload?.jti,
                            expiresIn: req.tokenPayload?.iat +
                                Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                            userId: req.tokenPayload?._id,
                        },
                    ],
                });
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
}
exports.default = new UserServices();
