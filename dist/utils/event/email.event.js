"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEvent = void 0;
const node_events_1 = require("node:events");
const send_email_1 = require("../email/send.email");
const email_template_1 = require("../email/email.template");
exports.emailEvent = new node_events_1.EventEmitter();
exports.emailEvent.on('confirmEmail', async (data) => {
    try {
        data.subject = 'Confirm_Email';
        data.html = (0, email_template_1.EmailTemplate)({
            otp: data.otp,
            name: data.name,
            title: 'Email Confirmation',
        });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log('Fail to send email ❌', error);
    }
});
exports.emailEvent.on('resetPassword', async (data) => {
    try {
        data.subject = 'Reset-Account-Password';
        data.html = (0, email_template_1.EmailTemplate)({
            otp: data.otp,
            name: data.name,
            title: 'Reset Code',
        });
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log('Fail to send email ❌', error);
    }
});
