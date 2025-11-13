"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AuthenticationService {
    constructor() { }
    signup = (req, res) => {
        let { name, email } = req.body;
        console.log({ name, email });
        return res.status(201).json({ message: 'Done', data: req.body });
    };
    login = (req, res) => {
        res.json({ message: 'Done', data: req.body });
    };
}
exports.default = new AuthenticationService();
