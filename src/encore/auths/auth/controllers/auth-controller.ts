import { APIError, ErrCode } from 'encore.dev/api';
import bcryptjs from 'bcryptjs';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { AccessDecoded, DefaultRes, RefreshDecoded } from '../../../../types';
import { MainModel } from '../../../../models/main-model';
import {
  catchError,
  generateClientId as generateUAId
} from '../../../../utils/helper';
import { APICallMeta, currentRequest } from 'encore.dev';
import { LoginReq, RegisterReq, XAuthReq } from '../../../../types/request';
import { col, fn, Op, where } from 'sequelize';
import jwtService from '../services/jwt-service';
import User from '../../../../models/user';
import Token from '../../../../models/token';

const authController = {
  async register({
    userAgent,
    username,
    email,
    password
  }: RegisterReq): Promise<DefaultRes> {
    if (!password) {
      console.log('REGISTER auth-controller >> Password field is empty!');
      throw new APIError(ErrCode.InvalidArgument, 'Password is empty!');
    }

    const hashPassword = await bcryptjs.hash(password, 10);

    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const user = await model.user.create({
        username,
        email,
        password: hashPassword
      });

      if (!user || !user.id) {
        console.warn('REGISTER auth-controller >> User registration failed!');
        throw new APIError(ErrCode.Internal, 'User registration failed!');
      }

      const accessToken = jwt.sign(
        {
          UserInfo: {
            id: user.id,
            username: user.username,
            role: user.roleId === 2 ? 'Author' : 'Admin'
          }
        },
        `${process.env.BASE_URL}`,
        { expiresIn: '30m' }
      );

      const refreshToken = jwt.sign(
        {
          UserInfo: {
            id: user.id,
            username: user.username
          }
        },
        'session_token',
        { expiresIn: '1d' }
      );

      const { uAId: clientId } = generateUAId(userAgent);
      if (!clientId) {
        console.warn('REGISTER auth-controller >> User agent is empty!');
        throw new APIError(
          ErrCode.InvalidArgument,
          'No user-agent data provided!'
        );
      }
      await model.token.create({
        refresh: refreshToken,
        access: accessToken,
        userId: user.id,
        clientId
      });

      return {
        status: 'Registered',
        message: 'User successfully registered',
        data: {
          username: user.username,
          email: user.email,
          role: user.roleId === 2 ? 'Author' : 'Admin',
          token: accessToken,
          refresh: refreshToken
        }
      };
    } catch (error) {
      const [err] = catchError('REGISTER auth-controller', error);
      throw err;
    }
  },
  async login({
    userAgent,
    emailOrUsername,
    password
  }: LoginReq): Promise<DefaultRes> {
    const callMeta = currentRequest() as APICallMeta;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    const payload = emailOrUsername.trim();
    const user = await model.user.findOne({
      where: {
        [Op.or]: [
          { email: payload },
          where(fn('lower', col('username')), payload.toLowerCase())
        ]
      }
    });
    if (!user || !user.password) {
      const errMsg = `LOGIN auth-controller >> ${
        !user?.password ? 'Password field is empty!' : "Username doesn't exist!"
      }`;
      console.warn(errMsg);

      throw new APIError(ErrCode.InvalidArgument, errMsg);
    }
    const correctPassword = bcryptjs.compare(password, user.password);
    if (!correctPassword) {
      console.warn('LOGIN auth-controller >> Password is incorrect!');
      throw new APIError(ErrCode.InvalidArgument, 'Password is incorrect!');
    }
    try {
      if (!user.id) return APIError.notFound('User not found!');

      const [accessToken, newRefreshToken] = await jwtService.generateJwt(
        user.username,
        user.roleId,
        user.id
      );
      const { uAId } = generateUAId(userAgent);
      if (!uAId) {
        console.warn('LOGIN auth-controller >> User agent is empty!');
        throw new APIError(ErrCode.InvalidArgument, 'User agent is empty!');
      }
      await model.token.create({
        refresh: newRefreshToken,
        access: accessToken,
        userId: user.id,
        clientId: uAId
      });

      return {
        status: 'Success',
        data: {
          username: user.username,
          name: user.name,
          email: user.email,
          desc: user.description,
          role: user.roleId === 1 ? 'Admin' : 'Author',
          img: user.picture,
          access: accessToken,
          refresh: newRefreshToken
        }
      };
    } catch (error) {
      const [err] = catchError('LOGIN auth-controller', error);
      throw err;
    }
  },
  async refreshToken({ xAuth }: XAuthReq) {
    if (!xAuth.startsWith('Bearer')) return null;
    const callMeta = currentRequest() as APICallMeta;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    let decodedUsername = '';
    let refreshToken = '';
    try {
      const clientId = xAuth.split(' ')[1];
      if (!clientId || clientId === 'undefined') {
        return APIError.unauthenticated('Missing clientId!');
      }

      const token = await model.token.findOne({
        where: { clientId }
      });
      if (!token) return APIError.permissionDenied('Token not found!');

      refreshToken = token.refresh;
      const foundToken = (await model.token.findByPk(refreshToken, {
        include: [
          {
            model: model.user,
            attributes: ['username', 'roleId']
          }
        ]
      })) as Token & { User: User };

      const decodedToken = jwt.verify(
        refreshToken,
        `${process.env.REFRESH_TOKEN_SECRET}`
      ) as (string | jwt.JwtPayload) & RefreshDecoded;
      const decodedUsernames = decodedToken.UserInfo.username;

      // Refresh token reuse detection!
      if (!foundToken) {
        if (decodedUsernames) {
          const hackedUser = await model.user.findOne({
            where: {
              username: decodedToken.UserInfo.username
            }
          });
          if (hackedUser) {
            const deletedTokens = await model.token.destroy({
              where: {
                userId: hackedUser.id
              }
            });
            console.warn(
              'REFRESH TOKEN auth-controller >>',
              `Reuse detected, deleting ${hackedUser.username}'s tokens:`,
              deletedTokens
            );
          }
        }

        console.warn(
          'REFRESH TOKEN auth-controller >> Refresh token reuse detected!'
        );

        throw new APIError(
          ErrCode.PermissionDenied,
          'Refresh token reuse detected!'
        );
      }

      const foundUsername = foundToken.User.username;
      if (foundUsername && decodedUsername) {
        if (foundUsername !== decodedUsername) {
          console.warn(
            'REFRESH TOKEN auth-controller >>',
            `Found token ${foundUsername} and decoded token ${decodedUsername} don't match!`
          );

          return new APIError(ErrCode.PermissionDenied, "Tokens don't match!");
        }

        // Refresh token is still valid
        const userRole = await model.userRole.findOne({
          where: { id: foundToken.User.roleId },
          attributes: ['role']
        });
        const [accessToken, newRefreshToken] = await jwtService.generateJwt(
          foundUsername,
          foundToken.User.roleId,
          foundToken.User.id
        );
        await model.token.update(
          { refresh: newRefreshToken, access: accessToken },
          { where: { refresh: refreshToken } }
        );

        return {
          status: 'Created',
          message: 'New refresh token created successfully',
          data: {
            username: decodedToken.UserInfo.username,
            access: accessToken,
            refresh: newRefreshToken
          }
        };
      }
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        console.error(
          'REFRESH TOKEN auth-controller >> Invalid JWT:',
          error.message
        );

        return new APIError(
          ErrCode.PermissionDenied,
          'Invalid refresh token signature!'
        );
      }
      if (error instanceof jwt.NotBeforeError) {
        console.error('REFRESH TOKEN auth-controller >> Token not yet active.');

        throw APIError.invalidArgument(
          'Token is not active yet! Please try again later.'
        );
      }
      if (error instanceof jwt.TokenExpiredError) {
        if (decodedUsername) {
          const deletedTokens = await model.token.destroy({
            where: {
              refresh: refreshToken
            }
          });
          console.error(
            'REFRESH TOKEN auth-controller >>',
            `Session expired, deleting ${decodedUsername}'s tokens:`,
            deletedTokens
          );

          throw APIError.permissionDenied('refresh token expired!');
        }
      }
      const [err] = catchError('REFRESH TOKEN auth-controller', error);

      throw err;
    }
  },
  async logout({ xAuth }: XAuthReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const clientId = xAuth.split(' ')[1];
      if (!clientId || clientId === 'undefined') {
        return APIError.unauthenticated('Missing clientId!');
      }

      const token = await model.token.findOne({
        where: { clientId }
      });
      if (!token) return APIError.permissionDenied('Token not found!');
      await model.token.destroy({
        where: { refresh: token.refresh }
      });

      return;
    } catch (error) {
      const [err] = catchError('LOGOUT auth-controller', error);
      throw err;
    }
  },
  async checkUsername({ xAuth }: XAuthReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const clientId = xAuth.split(' ')[1];
      if (!clientId || clientId === 'undefined') {
        throw APIError.unauthenticated('Missing clientId!');
      }

      const token = await model.token.findOne({
        where: { clientId }
      });
      if (!token) throw APIError.permissionDenied('Token not found!');

      const foundToken = (await model.token.findByPk(token.refresh, {
        attributes: ['token'],
        include: {
          model: model.user,
          attributes: ['username']
        }
      })) as Token & { User: { username: string } };

      if (!foundToken) {
        console.warn(
          'CHECK USERNAME auth-controller >> Refresh token not found!'
        );

        throw new APIError(
          ErrCode.PermissionDenied,
          'Refresh token not found!'
        );
      }

      return {
        status: 'Success',
        data: { username: foundToken.User.username }
      };
    } catch (error) {
      const [err] = catchError('CHECK USERNAME auth-controller', error);
      throw err;
    }
  }
};

export default authController;
