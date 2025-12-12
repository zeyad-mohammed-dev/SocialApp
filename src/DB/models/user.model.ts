import { HydratedDocument, model, models, Schema, Types } from 'mongoose';
import { BadRequestException } from '../../utils/response/error.response';
import { generateHash } from '../../utils/security/hash.security';
import { emailEvent } from '../../utils/event/email.event';

export enum GenderEnum {
  male = 'male',
  female = 'female',
}

export enum RoleEnum {
  user = 'user',
  admin = 'admin',
}

export enum ProviderEnum {
  GOOGLE = 'GOOGLE',
  SYSTEM = 'SYSTEM',
}

export interface IUser {
  // _id: Types.ObjectId;

  firstName: string;
  lastName: string;
  slug: string;
  username?: string;

  email: string;
  confirmEmailOtp?: string;
  confirmedAt?: Date;

  password: string;
  resetPasswordOTP?: string;
  changeCredentialsTime?: Date;

  phone?: string;
  address?: string;

  profileImage?: string;
  temProfileImage?: string;
  coverImages?: string[];

  gender: GenderEnum;
  role: RoleEnum;
  provider: ProviderEnum;

  freezedAt?: Date;
  freezedBy?: Types.ObjectId;
  restoredAt?: Date;
  restoredBy?: Types.ObjectId;
  friends?: Types.ObjectId[];

  createdAt: Date;
  updatedAt?: Date;
}

export type HUserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, minlength: 2, maxlength: 25 },
    lastName: { type: String, required: true, minlength: 2, maxlength: 25 },
    slug: { type: String, required: true, minlength: 5, maxlength: 51 },

    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmedAt: { type: Date },

    password: {
      type: String,
      required: function (): boolean {
        return this.provider === ProviderEnum.GOOGLE ? false : true;
      },
    },
    resetPasswordOTP: { type: String },
    changeCredentialsTime: { type: Date },

    phone: { type: String },
    address: { type: String },

    profileImage: { type: String },
    temProfileImage: { type: String },
    coverImages: [String],

    gender: { type: String, enum: GenderEnum, default: GenderEnum.male },
    role: { type: String, enum: RoleEnum, default: RoleEnum.user },
    provider: {
      type: String,
      enum: ProviderEnum,
      default: ProviderEnum.SYSTEM,
    },

    freezedAt: Date,
    freezedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    restoredAt: Date,
    restoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
  }
);

userSchema
  .virtual('username')
  .set(function (value: string) {
    const [firstName, lastName] = value.split(' ') || [];
    this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, '-') });
  })
  .get(function () {
    return this.firstName + ' ' + this.lastName;
  });

//signup pre
userSchema.pre(
  'save',
  async function (
    this: HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string },
    next
  ) {
    this.wasNew = this.isNew;
    if (this.isModified('password')) {
      this.password = await generateHash(this.password);
    }
    if (this.isModified('confirmEmailOtp')) {
      this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
      this.confirmEmailOtp = await generateHash(this.confirmEmailOtp as string);
    }
    next();
  }
);
userSchema.post('save', async function (doc, next) {
  const that = this as HUserDocument & {
    wasNew: boolean;
    confirmEmailPlainOtp?: string;
  };
  if (that.wasNew && that.confirmEmailPlainOtp) {
    emailEvent.emit('confirmEmail', {
      to: this.email,
      otp: that.confirmEmailPlainOtp,
      name: this.firstName,
    });
  }
  next();
});

//find hooks
userSchema.pre(['find', 'findOne'], function (next) {
  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }

  next();
});
// userSchema.pre(['find', 'findOne'], function (next) {
//   const query = this.getQuery();
//   console.log({
//     this: this,
//     query,
//     options: this.getOptions(),
//     op: this.model,
//   });
//   this.setOptions({ lean: false });
//   if (query.paranoid === false) {
//     this.setQuery({ ...query });
//   } else {
//     this.setQuery({ ...query, freezedAt: { $exists: false } });
//   }
//   this.populate({ path: 'freezedBy' });
//   next();
// });

// userSchema.pre(
//   'save',
//   async function (this: HUserDocument & { wasNew: boolean }, next) {
//     this.wasNew = this.isNew || this.isModified('email');
//     console.log({
//       pre_save: this,
//       isPasswordNew: this.isModified('password'),
//       newPaths: this.modifiedPaths(),
//       isNew: this.isNew,
//     });
//     if (this.isModified('password')) {
//       this.password = await generateHash(this.password);
//     }
//     next();
//   }
// );

// userSchema.post('save', function (doc, next) {
//   const that = this as HUserDocument & { wasNew: boolean };
//   console.log({
//     post_save: this,
//     doc,
//     isNew: that.wasNew,
//   });
//   if (that.wasNew) {
//     emailEvent.emit('confirmEmail', {
//       to: this.email,
//       otp: 545151,
//       name: this.username,
//     });
//   }
//   next();
// });

// userSchema.pre('validate', function (next) {
//   console.log({ pre: this });
//   if (!this.slug?.includes('-')) {
//     return next(
//       new BadRequestException(
//         "slug is required to have '-' between first name and last name"
//       )
//     );
//   }
//   next();
// });

// userSchema.post('validate', function (doc, next) {
//   console.log({ post: this });
//   next();
// });

export const UserModel = models.User || model<IUser>('User', userSchema);
