"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../DB/models/user.model");
const user_repository_1 = require("../../DB/repository/user.repository");
class AuthenticationService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    constructor() { }
    signup = async (req, res) => {
        let { userName, email, password } = req.body;
        const user = await this.userModel.createUser({ data: [{ userName, email, password }] });
        return res.status(201).json({ message: 'Done', data: { user } });
    };
    login = (req, res) => {
        res.json({ message: 'Done', data: req.body });
    };
}
exports.default = new AuthenticationService();
