import { APIError, Header } from 'encore.dev/api';

export type DefaultRes =
  | {
      status: string;
      data?: any;
      message?: string;
    }
  | APIError
  | undefined;

export type UserAgent = {
  browser: string;
  cpu: string;
  platform: string;
  vendor: string;
  engine: string;
  os: string;
};

export type RefreshDecoded = {
  UserInfo: {
    id: string;
    username: string;
  };
};

export type AccessDecoded = {
  UserInfo: {
    id: string;
    username: string;
    role: string;
  };
};

export type Social = {
  github: string;
  instagram: string;
  x: string;
  youtube: string;
  facebook: string;
  gitlab: string;
};

export type AnyObj = { [key: string]: any };

export interface AuthData {
  userID: string;
  username: string;
  role: string;
  refreshToken: string;
}
