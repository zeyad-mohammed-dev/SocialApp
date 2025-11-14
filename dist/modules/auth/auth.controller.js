"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_services_1 = __importDefault(require("./auth.services"));
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/signup', auth_services_1.default.signup);
router.post('/login', auth_services_1.default.login);
exports.default = router;
