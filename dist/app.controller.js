"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const auth_controller_1 = __importDefault(require("./modules/auth/auth.controller"));
const user_controller_1 = __importDefault(require("./modules/user/user.controller"));
const error_response_1 = require("./utils/response/error.response");
const connection_db_1 = __importDefault(require("./DB/connection.db"));
const s3_config_1 = require("./utils/multer/s3.config");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)('./config/.env.development') });
const node_util_1 = require("node:util");
const node_stream_1 = require("node:stream");
const createS3WriteStreamPipe = (0, node_util_1.promisify)(node_stream_1.pipeline);
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: '🚦 Too many request please try again later' },
    statusCode: 429,
});
const bootstrap = async () => {
    const app = (0, express_1.default)();
    const port = process.env.PORT || 5000;
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
    app.use((0, helmet_1.default)());
    app.use(limiter);
    app.get('/', (req, res) => {
        res.json({
            message: `Welcome to ${process.env.APPLICATION_NAME} backend landing page ❤🍀 `,
        });
    });
    app.use('/auth', auth_controller_1.default);
    app.use('/user', user_controller_1.default);
    app.get('/upload/*path', async (req, res) => {
        const { downloadName, download = 'false' } = req.query;
        const { path } = req.params;
        const Key = path.join('/');
        const s3Response = await (0, s3_config_1.getFile)({ Key });
        if (!s3Response.Body) {
            throw new error_response_1.BadRequestException('fail to fetch this asset');
        }
        res.setHeader('Content-Type', s3Response.ContentType || 'application/octet-stream');
        if (download == 'true') {
            res.setHeader('Content-Disposition', `attachment; filename="${downloadName || Key.split('/').pop()}"`);
        }
        return await createS3WriteStreamPipe(s3Response.Body, res);
    });
    app.use('{/*dummy}', (req, res) => {
        return res.status(404).json({
            message: '❌ Not valid routing, please check the method and URL.',
        });
    });
    app.use(error_response_1.globalErrorHandling);
    await (0, connection_db_1.default)();
    app.listen(port, () => {
        console.log(`Server is running on port :::${port} 🚀`);
    });
};
exports.default = bootstrap;
