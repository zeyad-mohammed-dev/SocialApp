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
const success_response_1 = require("../../utils/response/success.response");
class UserServices {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    tokenModel = new token_repository_1.TokenRepository(Token_model_1.TokenModel);
    constructor() { }
    profile = async (req, res) => {
        if (!req.user) {
            throw new error_response_1.UnauthorizedException('user not authenticated');
        }
        return (0, success_response_1.successResponse)({ res, data: { user: req.user } });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params || {};
        if (userId && req.user?.role !== User_model_1.RoleEnum.admin) {
            throw new error_response_1.ForbiddenException('not authorized user');
        }
        const user = await this.userModel.updateOne({
            filter: { _id: userId || req.user?._id, freezedAt: { $exists: false } },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialsTime: new Date(),
                $unset: { restoredAt: 1, restoredBy: 1 },
            },
        });
        if (!user.modifiedCount) {
            throw new error_response_1.NotFoundException('user not found or already freezed');
        }
        return (0, success_response_1.successResponse)({ res });
    };
    restoreAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.updateOne({
            filter: { _id: userId, freezedBy: { $ne: userId } },
            update: {
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                $unset: { freezedAt: 1, freezedBy: 1 },
            },
        });
        if (!user.modifiedCount) {
            throw new error_response_1.NotFoundException('user not found or freezed by account owner');
        }
        return (0, success_response_1.successResponse)({ res });
    };
    hardDeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: { _id: userId, freezedAt: { $exists: true } },
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException('user not found or not freezed');
        }
        await (0, s3_config_1.deleteFolderByPrefix)({ path: `users/${userId}` });
        return (0, success_response_1.successResponse)({ res });
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
        return (0, success_response_1.successResponse)({ res, data: { url } });
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
        return (0, success_response_1.successResponse)({ res, data: { user } });
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
        return (0, success_response_1.successResponse)({ res, statusCode });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokedToken)(req.tokenPayload);
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
            data: { credentials },
        });
    };
}
exports.default = new UserServices();
