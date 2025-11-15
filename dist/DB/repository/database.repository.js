"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRepository = void 0;
class DatabaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async findOne({ filter, select, options, }) {
        const doc = this.model.findOne(filter).select(select || '');
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async create({ data, options, }) {
        return await this.model.create(data, options);
    }
}
exports.DatabaseRepository = DatabaseRepository;
