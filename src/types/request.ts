import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/server';
import { Cookie, Header } from 'encore.dev/api';
import { TwoFAMethod } from '../utils/enums';

export type EmailOrUsernameReq = {
  emailOrUsername: string;
};

export type UsernameReq = {
  username: string;
};

export type UAReq = {
  userAgent: Header<'User-Agent'>;
};

export type RefreshTokenReq = {
  refreshToken: Cookie<'session_token'>;
};

export type RegisterReq = {
  email: string;
  password: string;
} & UsernameReq &
  UAReq;

export type LoginReq = {
  password: string;
} & EmailOrUsernameReq &
  RefreshTokenReq &
  UAReq;

export type DeleteSavedAccountReq = UsernameReq & UAReq;

export type AuthAppLoginReq = {
  token: string;
} & UAReq &
  EmailOrUsernameReq;

export type VerifyAuthAppReq = {
  token: string;
  secretId: string;
};

export type WebauthnGenerateLoginReq = EmailOrUsernameReq & UAReq;

export type WebauthnVerifyLoginReq = {
  option: AuthenticationResponseJSON;
} & UAReq;

export type WebauthnLoginReq = {
  optionId: string;
} & EmailOrUsernameReq &
  UAReq;

export type WebauthnVerifyRegisterReq = {
  options: RegistrationResponseJSON;
} & RefreshTokenReq &
  UAReq;

export type PatchAccount = {
  email: string;
  name: string;
  description: string;
  picture: string;
} & UsernameReq;

export type PatchSocialReq = { social: string; link: string };

export type PatchSettingReq = {
  twoFaEnabled: boolean;
  twoFaMethod?: TwoFAMethod;
  preference: string;
};

export type AddOrResetPasswordReq = {
  password: string;
  subject: string;
  limit: string;
} & UAReq;

export type SendAddPasswordLinkReq = {
  origin: Header<'origin'>;
} & RefreshTokenReq;

export type SendUpdateEmailOtpReq = {
  email: string;
  request: string;
  limit: string;
};

export type GetUpdateEmailOtpTime = { request: string; limit: string } & UAReq;

export type AddPostReq = {
  title: string;
  text: string;
  content: any[];
  tags: string;
};

export type PatchPostReq = {
  id: string;
} & AddPostReq;

export type PostsByPageReq = {
  number: number;
  size: number;
  query: any[];
  categories: string[];
  tags: string[];
};

export type PostByIdReq = {
  id: string;
};

export type DraftsByPageReq = {
  number: number;
  size: number;
  query: any[];
};

export type AddDraftReq = {
  title: string;
  text: string;
  content: any[];
};

export type PatchDraftReq = {
  id: string;
} & AddDraftReq;
