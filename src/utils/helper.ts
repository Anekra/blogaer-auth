import { UAParser } from 'ua-parser-js';
import initMainModel from '../models/main-model';
import { AuthData, UserAgent } from '../types';
import { Channel } from 'amqplib';
import { IncomingMessage } from 'http';
import { APIError, ErrCode, RawRequest } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';

export async function getAllUserImgsAndUsernames() {
  const model = await initMainModel;
  if (!model) return;
  return await model.user.findAll({
    attributes: ['id', 'username', 'picture']
  });
}

export async function getUserById(userId: string) {
  const model = await initMainModel;
  if (!model) return;
  return model.user.findByPk(userId, {
    attributes: ['username', 'picture']
  });
}

export function generateRandomChars(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export async function getMainModel() {
  return await initMainModel;
}

export function generateUAId(userAgent: string) {
  const uaParsed = new UAParser(userAgent ?? '');
  const client = uaParsed.getResult();
  const uAData = {
    browser: client.browser.name,
    cpu: client.cpu.architecture,
    platform: client.device.type || 'desktop',
    vendor: client.device.vendor,
    engine: client.engine.name,
    os: `${client.os.name} v-${client.os.version}`
  };
  const stringData = JSON.stringify(uAData);
  const secret = process.env.USER_AGENT_SECRET;
  const divider = process.env.USER_AGENT_DIVIDER;
  const uAId = Buffer.from(`${secret}${divider}${stringData}`).toString(
    'base64'
  );

  return { uAId, uAData };
}

export function getUserAgentData(clientId: string) {
  const decoded = Buffer.from(clientId, 'base64').toString();
  const divider = process.env.USER_AGENT_DIVIDER;
  const [secret, value] = decoded.split(`${divider}`);
  const SECRET = process.env.USER_AGENT_SECRET;

  if (secret !== SECRET) {
    return null;
  }

  return JSON.parse(value) as UserAgent;
}

export function getAuth() {
  const authData = getAuthData();
  if (!authData) throw APIError.unauthenticated('User is not authenticated!');

  return authData;
}

export function generateOtp() {
  let result = '';
  for (let i = 0; i < 6; i++) {
    const digit = Math.floor(Math.random() * 10);
    result += digit;
  }
  return result;
}

export async function closeChannel(timeout: NodeJS.Timeout, channel: Channel) {
  try {
    clearTimeout(timeout);
    if (channel) {
      console.warn('CLOSE CHANNEL helper >>', 'Set timeout!');
      await channel.close();
    }
  } catch (error) {
    console.warn('CLOSE CHANNEL helper >>', 'Set timeout error!');
  }
}

export async function parseJsonBody<T = any>(
  req: IncomingMessage | RawRequest
): Promise<T> {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const bodyStr = Buffer.concat(chunks).toString();
  return JSON.parse(bodyStr);
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [key, value] = cookie.trim().split('=');
      return [key, decodeURIComponent(value)];
    })
  );
}

export function catchError(errLocation: string, error: unknown) {
  const errMsg = `${errLocation} >> ${
    error instanceof Error
      ? error.message
      : "Error wasn't an instance of Error interface"
  }`;
  console.error(errMsg);

  if (error instanceof APIError) return [error, errMsg];

  return [new APIError(ErrCode.Internal, errMsg), errMsg];
}

export function errCodeToHttpStatus(code: ErrCode): number {
  switch (code) {
    case ErrCode.OK:
      return 200;
    case ErrCode.Canceled:
      return 499;
    case ErrCode.Unknown:
      return 500;
    case ErrCode.InvalidArgument:
      return 400;
    case ErrCode.DeadlineExceeded:
      return 504;
    case ErrCode.NotFound:
      return 404;
    case ErrCode.AlreadyExists:
      return 409;
    case ErrCode.PermissionDenied:
      return 403;
    case ErrCode.ResourceExhausted:
      return 429;
    case ErrCode.FailedPrecondition:
      return 412;
    case ErrCode.Aborted:
      return 409;
    case ErrCode.OutOfRange:
      return 400;
    case ErrCode.Unimplemented:
      return 501;
    case ErrCode.Internal:
      return 500;
    case ErrCode.Unavailable:
      return 503;
    case ErrCode.DataLoss:
      return 500;
    case ErrCode.Unauthenticated:
      return 401;
    default:
      return 500;
  }
}

export function getLastPath(path?: string) {
  const url = path ?? '/';
  const lastPath = url.split('?')[0].split('/').filter(Boolean).pop();

  return lastPath;
}
