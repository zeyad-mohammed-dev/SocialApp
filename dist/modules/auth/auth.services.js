"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../DB/models/User.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/event/email.event");
const otp_1 = require("../../utils/helpers/otp");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
class AuthenticationService {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    async verifyGoogleAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDs?.split(',') || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException('Failed to verify Google account');
        }
        return payload;
    }
    loginWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGoogleAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.GOOGLE,
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException('No account associated with this Gmail, please signup first');
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return res.status(200).json({ message: 'Done', data: { credentials } });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, given_name, family_name, name, picture } = await this.verifyGoogleAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
            },
        });
        if (user) {
            if (user.provider === User_model_1.ProviderEnum.GOOGLE) {
                return await this.loginWithGmail(req, res);
            }
            throw new error_response_1.ConflictException(`Email exist with another provider ${user.provider} `);
        }
        const newUser = await this.userModel.createUser({
            data: [
                {
                    email: email,
                    provider: User_model_1.ProviderEnum.GOOGLE,
                    firstName: given_name,
                    lastName: family_name,
                    profileImage: picture,
                    confirmedAt: new Date(),
                },
            ],
        });
        const credentials = await (0, token_security_1.createLoginCredentials)(newUser);
        return res.status(201).json({ message: 'Done', data: { credentials } });
    };
    signup = async (req, res) => {
        let { userName, email, password } = req.body;
        const checkUserExist = await this.userModel.findOne({
            filter: { email },
            select: 'email',
            options: { lean: true },
        });
        if (checkUserExist) {
            throw new error_response_1.ConflictException('Email exist');
        }
        const otp = (0, otp_1.generateNumberOtp)();
        const user = await this.userModel.createUser({
            data: [
                {
                    userName,
                    email,
                    password: await (0, hash_security_1.generateHash)(password),
                    confirmEmailOtp: await (0, hash_security_1.generateHash)(otp),
                },
            ],
        });
        email_event_1.emailEvent.emit('confirmEmail', { to: email, otp, name: userName });
        return res.status(201).json({ message: 'Done', data: { user } });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                confirmedAt: { $exists: false },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException('Invalid email or already confirmed');
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp))) {
            throw new error_response_1.ConflictException('Invalid OTP');
        }
        await this.userModel.updateOne({
            filter: { email },
            update: {
                confirmedAt: new Date(),
                $unset: { confirmEmailOtp: 1 },
            },
        });
        return res.json({ message: 'Done' });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await this.userModel.findOne({
            filter: { email, provider: User_model_1.ProviderEnum.SYSTEM },
        });
        if (!user) {
            throw new error_response_1.NotFoundException('Invalid credentials');
        }
        if (!user.confirmedAt) {
            throw new error_response_1.BadRequestException('Please confirm your email before login');
        }
        if (!(await (0, hash_security_1.compareHash)(password, user.password))) {
            throw new error_response_1.BadRequestException('Invalid credentials');
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return res.json({
            message: 'Done',
            data: { credentials },
        });
    };
    sendForgetPasswordCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException('No account associated with this email');
        }
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: { resetPasswordOTP: await (0, hash_security_1.generateHash)(String(otp)) },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException('Failed to send reset code, please try again');
        }
        console.log(email);
        email_event_1.emailEvent.emit('resetPasswordOTP', {
            to: email,
            otp,
            name: user.userName,
        });
        return res.json({
            message: 'Done',
        });
    };
    verifyForgetPasswordCode = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOTP: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException('No account associated with this email');
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOTP))) {
            throw new error_response_1.ConflictException('Invalid OTP');
        }
        return res.json({
            message: 'Done',
        });
    };
    resetForgetPassword = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOTP: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException('No account associated with this email');
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOTP))) {
            throw new error_response_1.ConflictException('Invalid OTP');
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                $unset: { resetPasswordOTP: 1 },
                changeCredentialsTime: new Date(),
            },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException('Failed to reset password, please try again');
        }
        return res.json({
            message: 'Done',
        });
    };
}
exports.default = new AuthenticationService();
