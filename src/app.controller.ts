// ===============================
// 🌟 Core Imports
// ===============================
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';

// ===============================
// 🛡️ Security & Middleware Packages
// ===============================
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// ===============================
// ⚙️ Environment Configuration
// ===============================
import { config } from 'dotenv';
import { resolve } from 'node:path';
import authRouter from './modules/auth/auth.controller';
import { globalErrorHandling } from './utils/response/error.response';
config({ path: resolve('./config/.env.development') });

// ===============================
// 🚦 Rate Limiter Setup
// ===============================
const limiter = rateLimit({
  windowMs: 60 * 60000,
  limit: 2000,
  message: { error: '🚦 Too many request please try again later' },
  statusCode: 429,
});

// ===============================
// 🚀 Application Bootstrap
// ===============================
const bootstrap = (): void => {
  const app: Express = express();
  const port: string | number = process.env.PORT || 5000;

  // ===============================
  // 🧰 Global Middlewares
  // ===============================
  app.use(express.json());
  app.use(cors());
  app.use(helmet());
  app.use(limiter);

  // ===============================
  // 🏠 Root Route (Landing Page)
  // ===============================
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: `❤🍀 Welcome to ${process.env.APPLICATION_NAME} backend landing page`,
    });
  });

  // ===============================
  // 🔐 App Routers
  // ===============================
  app.use('/auth', authRouter);

  // ===============================
  // ❌ Invalid Route Handler (Fallback)
  // ===============================
  app.use('{/*dummy}', (req: Request, res: Response) => {
    return res.status(404).json({ message: '❌ Not valid routing, please check the method and URL.' });
  });

  // ===============================
  // ❌ Global Error Handler
  // ===============================
  app.use(globalErrorHandling);

  // ===============================
  // 📡 Start Server
  // ===============================
  app.listen(port, () => {
    console.log(`🚀 Server is running on port :::${port}`);
  });
};

// ===============================
// 📦 Export Bootstrap Function
// ===============================
export default bootstrap;
