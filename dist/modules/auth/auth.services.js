"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../DB/models/user.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/event/email.event");
const otp_1 = require("../../utils/otp");
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
    login = (req, res) => {
        res.json({ message: 'Done', data: req.body });
    };
}
exports.default = new AuthenticationService();
