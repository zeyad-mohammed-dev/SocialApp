"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UserServices {
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
}
exports.default = new UserServices();
