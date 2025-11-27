import { HUserDocument } from '../../DB/models/User.model';
import { ILoginResponse } from '../auth/auth.entities';

export interface IProfileResponse {
  user: Partial<HUserDocument>;
}

export interface IProfileImageResponse {
  url: string;
}

export interface IProfileCoverImageResponse extends IProfileResponse {}

export interface IRefreshTokenResponse extends ILoginResponse {}
