"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_response_1 = require("../../utils/response/error.response");
class AuthenticationService {
    constructor() { }
    signup = (req, res) => {
        throw new error_response_1.BadRequestException("Fail", { extra: "We...." });
        res.status(201).json({ message: 'Done', data: req.body });
    };
    login = (req, res) => {
        res.json({ message: 'Done', data: req.body });
    };
}
exports.default = new AuthenticationService();
