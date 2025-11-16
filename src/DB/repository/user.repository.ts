import { DatabaseRepository } from './database.repository';
import { IUser as TDocument } from '../models/User.model';
import { Model } from 'mongoose';
import { CreateOptions } from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { BadRequestException } from '../../utils/response/error.response';

export class UserRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }

  async createUser({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions;
  }): Promise<HydratedDocument<TDocument>> {
    const [user] = (await this.create({ data, options })) || [];

    if (!user) {
      throw new BadRequestException('Fail to signup this user data');
    }
    return user;
  }
}
