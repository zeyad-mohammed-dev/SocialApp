"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.couldFileUpload = exports.fileValidation = exports.StorageEnum = void 0;
const multer_1 = __importDefault(require("multer"));
const os_1 = __importDefault(require("os"));
const error_response_1 = require("../response/error.response");
var StorageEnum;
(function (StorageEnum) {
    StorageEnum["memory"] = "memory";
    StorageEnum["disk"] = "disk";
})(StorageEnum || (exports.StorageEnum = StorageEnum = {}));
exports.fileValidation = {
    image: ['image/jpeg', 'image/png', 'image/gif'],
};
const couldFileUpload = ({ validation = [], storageApproach = StorageEnum.memory, maxSizeMB = 2, }) => {
    const storage = storageApproach === StorageEnum.memory
        ? multer_1.default.memoryStorage()
        : multer_1.default.diskStorage({
            destination: os_1.default.tmpdir(),
            filename: function (req, file, callback) {
                callback(null, Date.now() + '-' + file.originalname);
            },
        });
    function fileFilter(req, file, callback) {
        if (!validation.includes(file.mimetype)) {
            return callback(new error_response_1.BadRequestException('Invalid file type', {
                validationError: [
                    {
                        key: 'file',
                        issue: [{ path: 'file', message: 'Invalid file type' }],
                    },
                ],
            }));
        }
        return callback(null, true);
    }
    return (0, multer_1.default)({
        fileFilter,
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
        storage,
    });
};
exports.couldFileUpload = couldFileUpload;
