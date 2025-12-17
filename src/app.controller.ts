// ===============================
// 🌟 Core Imports
// ===============================
import express from 'express';
import type { Express, Request, Response } from 'express';

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

import { authRouter, postRouter, userRouter } from './modules';
// import { router as authRouter } from './modules/auth';

// // import authRouter from './modules/auth/auth.controller';
// import userRouter from './modules/user/user.controller';
import {
  BadRequestException,
  globalErrorHandling,
} from './utils/response/error.response';
import connectDB from './DB/connection.db';
import { createGetPreSignedLink, getFile } from './utils/multer/s3.config';
config({ path: resolve('./config/.env.development') });

// ===============================
// 📦 AWS S3 – File Streaming Setup
// ===============================
import { promisify } from 'node:util';
import { pipeline } from 'node:stream';
const createS3WriteStreamPipe = promisify(pipeline);

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
const bootstrap = async (): Promise<void> => {
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
      message: `Welcome to ${process.env.APPLICATION_NAME} backend landing page ❤🍀 `,
    });
  });

  // ===============================
  // 🔐 App Router
  // ===============================
  app.use('/auth', authRouter);
  app.use('/user', userRouter);
  app.use('/post', postRouter);

  // ===============================
  // 📦 AWS S3 Asset Delivery (Pre-Signed + Direct Streaming)
  // ===============================

  app.get(
    '/upload/pre-signed/*path',
    async (req: Request, res: Response): Promise<Response> => {
      const { downloadName, download = 'false' } = req.query as {
        downloadName?: string;
        download?: string;
      };
      const { path } = req.params as unknown as { path: string[] };

      const Key = path.join('/');

      const url = await createGetPreSignedLink({
        Key,
        downloadName: downloadName as string,
        download,
      });

      return res.json({ message: 'Done', data: { url } });
    }
  );

  app.get(
    '/upload/*path',
    async (req: Request, res: Response): Promise<void> => {
      const { downloadName, download = 'false' } = req.query as {
        downloadName?: string;
        download?: string;
      };

      const { path } = req.params as unknown as { path: string[] };

      const Key = path.join('/');

      const s3Response = await getFile({ Key });

      if (!s3Response.Body) {
        throw new BadRequestException('fail to fetch this asset');
      }

      res.set("Cross-Origin-Resource-Policy","cross-origin");
      res.setHeader(
        'Content-Type',
        s3Response.ContentType || 'application/octet-stream'
      );

      if (download == 'true') {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${downloadName || Key.split('/').pop()}"`
        );
      }

      return await createS3WriteStreamPipe(
        s3Response.Body as NodeJS.ReadableStream,
        res
      );
    }
  );

  // ===============================
  // ❌ Invalid Route Handler (Fallback)
  // ===============================
  app.use('{/*dummy}', (req: Request, res: Response) => {
    return res.status(404).json({
      message: '❌ Not valid routing, please check the method and URL.',
    });
  });

  // ===============================
  // ❌ Global Error Handler
  // ===============================
  app.use(globalErrorHandling);

  // 📂 DataBase
  await connectDB();

  // ===============================
  // 💬 Tests
  // ===============================

  // async function test() {
  //   try {
  //     // const user = new UserModel({
  //     //   username: 'zeyad Mohammed',
  //     //   email: `${Date.now()}@gmail.com`,
  //     //   password: 'AVSjsut382',
  //     // });
  //     // await user.save({ validateBeforeSave: true });

  //     // const userModel = new UserRepository(UserModel);
  //     // const user = (await userModel.findOne({
  //     //   filter: { gender: GenderEnum.female },
  //     // })) as HUserDocument;
  //     // console.log({ result: user });

  //     const userModel = new UserRepository(UserModel);
  //     const users = await userModel.find({
  //       filter: { paranoid: false },
  //       options: { limit: 2, skip: 0 },
  //     });
  //     console.log(users);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
  // test();

  // ===============================
  // 📡 Start Server
  // ===============================
  app.listen(port, () => {
    console.log(`Server is running on port :::${port} 🚀`);
  });
};

// ===============================
// 📦 Export Bootstrap Function
// ===============================
export default bootstrap;
