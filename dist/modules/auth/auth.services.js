"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../DB/models/user.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/event/email.event");
const otp_1 = require("../../utils/helpers/otp");
const token_security_1 = require("../../utils/security/token.security");
class AuthenticationService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    constructor() { }
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
            filter: { email },
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
        const access_token = await (0, token_security_1.generateToken)({
            payload: { _id: user._id },
        });
        const refresh_token = await (0, token_security_1.generateToken)({
            payload: { _id: user._id },
            secret: process.env.REFRESH_USER_TOKEN_SIGNATURE,
            options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRED_IN) },
        });
        return res.json({
            message: 'Done',
            data: { credentials: { access_token, refresh_token } },
        });
    };
}
exports.default = new AuthenticationService();
