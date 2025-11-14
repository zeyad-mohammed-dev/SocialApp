"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_repository_1 = require("../../DB/repository/database.repository");
const user_model_1 = require("../../DB/models/user.model");
const error_response_1 = require("../../utils/response/error.response");
class AuthenticationService {
    userModel = new database_repository_1.DatabaseRepository(user_model_1.UserModel);
    constructor() { }
    signup = async (req, res) => {
        let { userName, email, password } = req.body;
        const [user] = (await this.userModel.create({
            data: [{ userName, email, password }],
            options: { validateBeforeSave: true },
        })) || [];
        if (!user) {
            throw new error_response_1.BadRequestException('Fail to create this user data');
        }
        return res.status(201).json({ message: 'Done', data: { user } });
    };
    login = (req, res) => {
        res.json({ message: 'Done', data: req.body });
    };
}
exports.default = new AuthenticationService();
