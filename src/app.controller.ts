import express from 'express';
import type { Express, Request, Response } from 'express';

import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve('./config/.env.development') });

const limiter = rateLimit({
  windowMs: 60 * 60000,
  limit: 2000,
  message: { error: 'Too many request please try again later' },
  statusCode: 429,
});

const bootstrap = (): void => {
  const app: Express = express();
  const port: string | number = process.env.PORT || 5000;
app.use(express.json())
  app.use(cors())
  app.use(helmet())
  app.use(limiter)

  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: `Welcome to ${process.env.APPLICATION_NAME} backend landing page ❤🍀`,
    });
  });

  app.listen(3000, () => {
    console.log(`Server is running on port :::${port}`);
  });
};

export default bootstrap;
