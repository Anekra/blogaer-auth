import { Gateway, Header } from 'encore.dev/api';
import { authHandler } from 'encore.dev/auth';
import mainModel from '../../../models/main-model';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { AccessDecoded } from '../../../types';

interface AuthParams {
  authorization: Header<'Authorization'>;
}

interface AuthData {
  userID: string;
  username: string;
  role: string;
  refreshToken: string;
}

async function mainAuth({
  authorization
}: AuthParams): Promise<AuthData | null> {
  if (!authorization.startsWith('Bearer')) return null;
  const clientId = authorization.split(' ')[1];
  if (!clientId || clientId === 'undefined' || clientId === 'null') return null;

  const model = await mainModel;
  const token = await model.token.findOne({
    where: {
      clientId,
      access: {
        [Op.gte]: new Date(Date.now() - 15 * 60 * 1000)
      }
    }
  });
  if (!token) return null;

  const accessToken = token.access;
  const foundToken = jwt.verify(
    accessToken,
    `${process.env.ACCESS_TOKEN_SECRET}`
  ) as (string | jwt.JwtPayload) & AccessDecoded;
  if (foundToken.hasOwnProperty('UserInfo') === false) return null;

  return {
    userID: foundToken.UserInfo.id,
    username: foundToken.UserInfo.username,
    role: foundToken.UserInfo.role,
    refreshToken: token.refresh
  };
}

export const auth = authHandler<AuthParams, AuthData>(mainAuth);

export const getaway = new Gateway({
  authHandler: auth
});
