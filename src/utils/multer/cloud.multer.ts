import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import os from 'os';
import { BadRequestException } from '../response/error.response';

export enum StorageEnum {
  memory = 'memory',
  disk = 'disk',
}

export const fileValidation = {
  image: ['image/jpeg', 'image/png', 'image/gif'],
};

export const couldFileUpload = ({
  validation = [],
  storageApproach = StorageEnum.memory,
  maxSizeMB = 2,
}: {
  validation?: string[];
  storageApproach?: StorageEnum;
  maxSizeMB?: number;
}): multer.Multer => {
  const storage =
    storageApproach === StorageEnum.memory
      ? multer.memoryStorage()
      : multer.diskStorage({
          destination: os.tmpdir(),
          filename: function (
            req: Request,
            file: Express.Multer.File,
            callback
          ) {
            callback(null, Date.now() + '-' + file.originalname);
          },
        });

  function fileFilter(
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ) {
    if (!validation.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Invalid file type', {
          validationError: [
            {
              key: 'file',
              issue: [{ path: 'file', message: 'Invalid file type' }],
            },
          ],
        })
      );
    }
    return callback(null, true);
  }

  return multer({
    fileFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    storage,
  });
};
