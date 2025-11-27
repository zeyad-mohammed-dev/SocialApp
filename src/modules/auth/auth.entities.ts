export interface ILoginResponse {
  credentials: {
    access_token: string;
    refresh_token: string;
  };
}

export interface ILoginWithGmailResponse extends ILoginResponse {}

export interface ISignupWithGmailResponse extends ILoginResponse {}
