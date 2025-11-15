"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplate = void 0;
const EmailTemplate = ({ otp, name, title, }) => {
    const currentYear = new Date().getFullYear();
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f2f4f8;
    }
    .email-container {
      max-width: 620px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 25px rgba(0,0,0,0.08);
      border: 1px solid #e6e9ee;
    }
    .email-header {
      background: linear-gradient(135deg, #6a5af9, #ff4ecd);
      color: #ffffff;
      text-align: center;
      padding: 35px 25px;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .email-body {
      padding: 28px;
      color: #2d3436;
      line-height: 1.7;
      font-size: 16px;
    }
    .email-body h2 {
      margin-top: 0;
      color: #6a5af9;
      font-size: 22px;
      font-weight: 600;
    }
    .activation-code {
      display: inline-block;
      background: #6a5af9;
      color: #ffffff !important;
      padding: 14px 30px;
      border-radius: 10px;
      font-size: 22px;
      margin: 25px 0;
      font-weight: bold;
      letter-spacing: 3px;
      box-shadow: 0 4px 12px rgba(106, 90, 249, 0.25);
    }
    .email-footer {
      text-align: center;
      padding: 22px;
      background-color: #f8f9fb;
      font-size: 14px;
      color: #8d99ae;
    }
    .email-footer a {
      color: #6a5af9;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${title}</h1>
    </div>
    <div class="email-body">
      <h2>Hello ${name}, 👋</h2>
      <p>Welcome to <strong>SocialApp</strong> — your new space to share, connect, and express yourself 🌐✨</p>
      <p>Please use the verification code below to complete your action:</p>

      <div class="activation-code">${otp}</div>

      <p>This code is valid for a short time. If you didn’t request this, you can safely ignore this email.</p>
      <p>Best regards,<br><strong>SocialApp Team</strong></p>
    </div>
    <div class="email-footer">
      <p>&copy; ${currentYear} SocialApp. All rights reserved.</p>
      <p><a href="#">Contact Support</a> • <a href="#">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>`;
};
exports.EmailTemplate = EmailTemplate;
