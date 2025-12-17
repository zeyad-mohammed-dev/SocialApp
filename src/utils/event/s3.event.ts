import { EventEmitter } from 'node:events';
import { deleteFile, getFile } from '../multer/s3.config';
import { HUserDocument, UserModel } from '../../DB/models/User.model';
import { UserRepository } from '../../DB/repository';
import { UpdateQuery } from 'mongoose';

export const s3Event = new EventEmitter();

s3Event.on('trackProfileImage', (data) => {
  // console.log(data);

  setTimeout(async () => {
    const userModel = new UserRepository(UserModel);
    try {
      await getFile({ Key: data.key });
      await userModel.updateOne({
        filter: { _id: data.userId },
        update: { $unset: { temProfileImage: 1 } },
      });
      await deleteFile({ Key: data.oldKey });
      // console.log('Done 🌺👌🏻');
    } catch (error: any) {
      let unsetData: UpdateQuery<HUserDocument> = { temProfileImage: 1 };
      if (!data.oldKey) {
        unsetData = { temProfileImage: 1, profileImage: 1 };
      }
      // console.log(error.Code);
      if (error.Code === 'NoSuchKey') {
        await userModel.updateOne({
          filter: { _id: data.userId },
          update: { profileImage: data.oldKey, $unset: unsetData },
        });
      }
    }
  }, data.expiresIn || Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS) * 1000);
});
