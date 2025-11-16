import { Model } from "mongoose";
import { IToken, IToken as TDocument } from "../models/Token.model";
import { DatabaseRepository } from "./database.repository";




export class TokenRepository extends DatabaseRepository<TDocument> {

constructor(protected override readonly model : Model<TDocument>){
    super(model)
}


}