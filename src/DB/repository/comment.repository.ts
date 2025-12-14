import { Model } from 'mongoose';
import { IComment as TDocument } from '../models';
import { DatabaseRepository } from './database.repository';

export class CommentRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }
}
