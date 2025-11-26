"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../DB/models/User.model");
const token_security_1 = require("../../utils/security/token.security");
const user_repository_1 = require("../../DB/repository/user.repository");
const token_repository_1 = require("../../DB/repository/token.repository");
const Token_model_1 = require("../../DB/models/Token.model");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const error_response_1 = require("../../utils/response/error.response");
const s3_event_1 = require("../../utils/event/s3.event");
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
    profileImage = async (req, res) => {
        const { ContentType, OriginalName, } = req.body;
        const { url, key } = await (0, s3_config_1.createPreSignedUploadLink)({
            ContentType,
            OriginalName,
            path: `users/${req.tokenPayload?._id}`,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: { profileImage: key, temProfileImage: req.user?.profileImage },
        });
        if (!user) {
            throw new error_response_1.BadRequestException('fail to update user profile image');
        }
        s3_event_1.s3Event.emit('trackProfileImage', {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            key,
            expiresIn: 60000,
        });
        return res.json({
            message: 'Done',
            data: {
                url,
                key,
            },
        });
    };
    profileCoverImage = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            storageApproach: cloud_multer_1.StorageEnum.disk,
            files: req.files,
            path: `users/${req.tokenPayload?._id}/cover`,
            useLarge: true,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                coverImages: urls,
            },
        });
        if (!user) {
            throw new error_response_1.BadRequestException('fail to update user cover images');
        }
        if (req.user?.coverImages) {
            await (0, s3_config_1.deleteFiles)({ urls: req.user.coverImages });
        }
        return res.status(200).json({
            message: 'Done',
            data: {
                urls,
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
