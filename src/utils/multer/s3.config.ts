import { v4 as uuid } from 'uuid';
import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { StorageEnum } from './cloud.multer';
import { createReadStream } from 'node:fs';
import { BadRequestException } from '../response/error.response';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Config = () => {
  return new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
};

export const uploadFile = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = 'private',
  path = 'general',
  file,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket,
    ACL,
    Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${
      file.originalname
    }`,
    Body:
      storageApproach === StorageEnum.memory
        ? file.buffer
        : createReadStream(file.path),
    ContentType: file.mimetype,
  });

  await s3Config().send(command);

  if (!command?.input?.Key) {
    throw new BadRequestException('File upload failed');
  }

  return command.input.Key;
};

export const uploadLargeFile = async ({
  storageApproach = StorageEnum.disk,
  Bucket = process.env.AWS_BUCKET_NAME,
  ACL = 'private',
  path = 'general',
  file,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}) => {
  const upload = new Upload({
    client: s3Config(),
    params: {
      Bucket,
      ACL,
      Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${
        file.originalname
      }`,
      Body:
        storageApproach === StorageEnum.memory
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype,
    },
  });

  upload.on('httpUploadProgress', (progress) => {
    console.log('Upload Progress:', progress);
  });

  const { Key } = await upload.done();

  if (!Key) {
    throw new BadRequestException('File upload failed');
  }

  return Key;
};

export const uploadFiles = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = 'private',
  path = 'general',
  files,
  useLarge = false,
}: {
  storageApproach?: StorageEnum;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  files: Express.Multer.File[];
  useLarge?: boolean;
}): Promise<string[]> => {
  let urls: string[] = [];

  if (useLarge) {
    urls = await Promise.all(
      files.map((file) => {
        return uploadLargeFile({
          storageApproach,
          Bucket,
          ACL,
          path,
          file,
        });
      })
    );
  } else {
    urls = await Promise.all(
      files.map((file) => {
        return uploadFile({
          storageApproach,
          Bucket,
          ACL,
          path,
          file,
        });
      })
    );
  }

  return urls;
};

export const createPreSignedUploadLink = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path = 'general',
  expiresIn = 120,
  ContentType,
  OriginalName,
}: {
  Bucket?: string;
  path?: string;
  expiresIn?: number;
  ContentType: string;
  OriginalName: string;
}): Promise<{ url: string; key: string }> => {
  const command = new PutObjectCommand({
    Bucket,
    Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${OriginalName}`,
    ContentType,
  });

  const url = await getSignedUrl(s3Config(), command, { expiresIn });

  if (!url || !command?.input?.Key) {
    throw new BadRequestException('Could not create pre-signed URL');
  }

  return { url, key: command.input.Key };
};

export const createGetPreSignedLink = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  Key,
  expiresIn = 120,
  download = 'false',
  downloadName = 'dummy',
}: {
  Bucket?: string;
  Key: string;
  expiresIn?: number;
  download?: string;
  downloadName?: string;
}): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket,
    Key,
    ResponseContentDisposition:
      download === 'true'
        ? `attachment; filename="${downloadName || Key.split('/').pop()}"`
        : undefined,
  });

  const url = await getSignedUrl(s3Config(), command, { expiresIn });

  if (!url) {
    throw new BadRequestException('Could not create pre-signed URL');
  }

  return url;
};

export const getFile = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  Key,
}: {
  Bucket?: string;
  Key: string;
}): Promise<GetObjectCommandOutput> => {
  const command = new GetObjectCommand({
    Bucket,
    Key,
  });

  return await s3Config().send(command);
};

export const deleteFile = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  Key,
}: {
  Bucket?: string;
  Key: string;
}): Promise<DeleteObjectCommandOutput> => {
  const command = new DeleteObjectCommand({
    Bucket,
    Key,
  });

  return await s3Config().send(command);
};

export const deleteFiles = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  urls,
  Quiet = false,
}: {
  Bucket?: string;
  urls: string[];
  Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
  const Objects = urls.map((url) => {
    return { Key: url };
  });

  const command = new DeleteObjectsCommand({
    Bucket,
    Delete: {
      Objects,
      Quiet,
    },
  });

  return await s3Config().send(command);
};

export const listDirectoryFiles = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path,
}: {
  Bucket?: string;
  path: string;
}) => {
  const command = new ListObjectsV2Command({
    Bucket,
    Prefix: `${process.env.APPLICATION_NAME}/${path}`,
  });

  return await s3Config().send(command);
};

export const deleteFolderByPrefix = async ({
  path,
}: {
  path: string;
}): Promise<DeleteObjectsCommandOutput> => {
  const fileList = await listDirectoryFiles({
    path,
  });

  if (!fileList?.Contents?.length) {
    throw new BadRequestException('No files found in this directory');
  }
  const urls: string[] = fileList.Contents.map((file) => {
    return file.Key as string;
  });

  return await deleteFiles({ urls });
};
