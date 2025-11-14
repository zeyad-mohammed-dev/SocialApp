import { model, models, Schema, Types } from 'mongoose';

export enum GenderEnum {
  male = 'male',
  female = 'female',
}

export enum RoleEnum {
  user = 'user',
  admin = 'admin',
}

export interface IUser {
  // _id: Types.ObjectId;

  firstName: string;
  lastName: string;
  userName?: string;

  email: string;
  confirmEmailOTP?: string;
  confirmedAt?: Date;

  password: string;
  resetPassword?: string;
  changeCredentialsTime?: Date;

  phone?: string;
  address?: string;

  gender: GenderEnum;
  role: RoleEnum;

  createdAt: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, minlength: 3, maxlength: 30 },
    lastName: { type: String, required: true, minlength: 3, maxlength: 30 },

    email: { type: String, required: true, unique: true },
    confirmEmailOTP: { type: String },
    confirmedAt: { type: Date },

    password: { type: String, required: true },
    resetPassword: { type: String },
    changeCredentialsTime: { type: Date },

    phone: { type: String },
    address: { type: String },

    gender: { type: String, enum: GenderEnum, default: GenderEnum.male },
    role: { type: String, enum: RoleEnum, default: RoleEnum.user },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema
  .virtual('userName')
  .set(function (value: string) {
    const [firstName, lastName] = value.split(' ') || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return this.firstName + ' ' + this.lastName;
  });

export const UserModel = models.User || model<IUser>('User', userSchema);
