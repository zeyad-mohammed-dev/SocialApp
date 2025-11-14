"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const node_console_1 = require("node:console");
const user_model_1 = require("./models/user.model");
const connectDB = async () => {
    try {
        const result = await (0, mongoose_1.connect)(process.env.DB_URI, {
            serverSelectionTimeoutMS: 30000,
        });
        await user_model_1.UserModel.syncIndexes();
        console.log(result.models);
        console.log('DB connected successfully 🚀');
    }
    catch (error) {
        (0, node_console_1.log)('Fail to connect on DB ❌');
    }
};
exports.default = connectDB;
