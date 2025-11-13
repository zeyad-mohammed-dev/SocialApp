import type { NextFunction, Request, Response } from 'express';

export interface IError extends Error {
  statusCode: number;
}

export class ApplicationException extends Error {
  constructor(message: string, public statusCode: Number = 400, cause?: unknown) {
    super(message, { cause });
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends ApplicationException {
  constructor(message: string, cause?: unknown) {
    super(message, 400, cause);
  }
}

export class NotFoundException extends ApplicationException {
  constructor(message: string, cause?: unknown) {
    super(message, 404, cause);
  }
}

export const globalErrorHandling = (error: IError, req: Request, res: Response, next: NextFunction) => {
  process.env.MOOD === 'development' ? console.log(error.stack) : undefined;

  return res.status(error.statusCode || 500).json({
    error_message: error.message || '❌ something went wrong !',
    cause: error.cause,
    error,
  });
};
