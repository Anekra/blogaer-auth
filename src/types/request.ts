import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/server';
import { Header } from 'encore.dev/api';
import { TwoFAMethod } from '../utils/enums';

export interface AuthReq {
  authorization: Header<'authorization'>;
}

export interface XAuthReq {
  xAuth: Header<'x-authorization'>;
}

export interface EmailOrUsernameReq {
  emailOrUsername: string;
}

export interface UsernameReq {
  username: string;
}

export interface UAReq {
  userAgent: Header<'User-Agent'>;
}

export interface RegisterReq extends UsernameReq, UAReq {
  email: string;
  password: string;
}

export interface LoginReq extends EmailOrUsernameReq, UAReq {
  password: string;
}

export interface RefreshTokenReq extends XAuthReq, UAReq {}

export interface DeleteSavedAccountReq extends UsernameReq, UAReq {}

export interface AuthAppLoginReq extends UAReq, EmailOrUsernameReq {
  token: string;
}

export interface VerifyAuthAppReq {
  token: string;
  secretId: string;
}

export interface WebauthnGenerateLoginReq extends EmailOrUsernameReq, UAReq {}

export interface WebauthnVerifyLoginReq extends UAReq {
  option: AuthenticationResponseJSON;
}

export interface WebauthnLoginReq extends EmailOrUsernameReq, UAReq {
  optionId: string;
}

export interface WebauthnVerifyRegisterReq extends UAReq {
  options: RegistrationResponseJSON;
}

export interface PatchAccountReq extends UsernameReq {
  email: string;
  name: string;
  description: string;
  picture: string;
}

export interface PatchSocialReq {
  social: string;
  link: string;
}

export interface PatchSettingReq {
  twoFaEnabled: boolean;
  twoFaMethod?: TwoFAMethod;
  preference: string;
}

export interface AddOrResetPasswordReq extends UAReq {
  password: string;
  subject: string;
  limit: string;
}

export interface SendAddPasswordLinkReq {
  origin: Header<'origin'>;
}

export interface SendUpdateEmailOtpReq {
  email: string;
  request: string;
  limit: string;
}

export interface GetUpdateEmailOtpTime extends UAReq {
  request: string;
  limit: string;
}

export interface AddPostReq {
  title: string;
  text: string;
  content: any[];
  tags: string;
}

export interface PatchPostReq extends AddPostReq {
  id: string;
}

export interface PostsByPageReq {
  number: number;
  size: number;
  query: any[];
  categories: string[];
  tags: string[];
}

export interface PostByIdReq {
  id: string;
}

export interface DraftsByPageReq {
  number: number;
  size: number;
  query: any[];
}

export interface AddDraftReq {
  title: string;
  text: string;
  content: any[];
}

export interface PatchDraftReq extends AddDraftReq {
  id: string;
}
