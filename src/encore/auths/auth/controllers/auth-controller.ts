import { APIError, ErrCode } from 'encore.dev/api';
import bcryptjs from 'bcryptjs';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import {
  AccessDecoded,
  AuthData,
  DefaultRes,
  RefreshDecoded
} from '../../../../types';
import { MainModel } from '../../../../models/main-model';
import { catchError, generateClientId } from '../../../../utils/helper';
import { APICallMeta, currentRequest } from 'encore.dev';
import { LoginReq, RegisterReq, XAuthReq } from '../../../../types/request';
import { col, fn, Op, where } from 'sequelize';
import jwtService from '../services/jwt-service';
import User from '../../../../models/user';
import Token from '../../../../models/token';
import { getAuthData } from 'encore.dev/internal/codegen/auth';

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

      const { clientId } = generateClientId(userAgent);
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
    refreshToken,
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
      if (user.id) {
        const [accessToken, newRefreshToken] = await jwtService.generateJwt(
          user.username,
          user.roleId,
          user.id
        );

        const { clientId } = generateClientId(userAgent);
        if (!clientId) {
          console.warn('LOGIN auth-controller >> User agent is empty!');
          throw new APIError(ErrCode.InvalidArgument, 'User agent is empty!');
        }
        await model.token.create({
          refresh: newRefreshToken,
          access: accessToken,
          userId: user.id,
          clientId
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
      } else {
        const deletedToken = await model.token.destroy({
          where: { refresh: refreshToken }
        });
        console.warn(
          'LOGIN auth-controller deleted refresh token after reuse detected >>',
          deletedToken
        );

        throw new APIError(ErrCode.PermissionDenied, 'Token reuse detected!');
      }
    } catch (error) {
      const [err] = catchError('LOGIN auth-controller', error);
      throw err;
    }
  },
  async refreshToken({ xAuth }: XAuthReq) {
    const callMeta = currentRequest() as APICallMeta;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    try {
      if (!xAuth.startsWith('Bearer')) return null;
      const clientId = xAuth.split(' ')[1];
      if (!clientId || clientId === 'undefined' || clientId === 'null') return null;

      const token = await model.token.findOne({
        where: {
          clientId,
          access: {
            [Op.gte]: new Date(Date.now() - 15 * 60 * 1000)
          }
        }
      });
      if (!token) return null;

      const foundToken = (await model.token.findByPk(token.refresh, {
        include: [
          {
            model: model.user,
            attributes: ['username', 'roleId']
          }
        ]
      })) as Token & { User: User };

      // Refresh token reuse detection!
      jwt.verify(
        refreshToken,
        `${process.env.REFRESH_TOKEN_SECRET}`,
        async (err: VerifyErrors | null, decoded?: string | JwtPayload) => {
          const decodedToken = decoded as AccessDecoded;
          const decodedTokenUsername = decodedToken?.UserInfo.username;
          if (!foundToken) {
            if (err) {
              console.warn(
                'REFRESH TOKEN auth-controller >>',
                'Refresh token reuse detected: No user was found!'
              );

              throw new APIError(
                ErrCode.PermissionDenied,
                'No user was found!'
              );
            }

            if (decodedTokenUsername) {
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
          if (err) {
            if (decodedTokenUsername) {
              const deletedTokens = await model.token.destroy({
                where: {
                  refresh: refreshToken
                }
              });
              console.warn(
                'REFRESH TOKEN auth-controller >>',
                `Session expired, deleting ${decodedTokenUsername}'s tokens:`,
                deletedTokens
              );

              return new APIError(
                ErrCode.PermissionDenied,
                `User ${decodedTokenUsername}'s token expires.`
              );
            } else {
              console.warn(
                'REFRESH TOKEN auth-controller >>',
                `Error!: ${err}`
              );

              return new APIError(ErrCode.Internal, `Error!: ${err.message}`);
            }
          }
          const foundTokenUsername = foundToken.User.username;
          if (foundTokenUsername && decodedTokenUsername) {
            if (foundTokenUsername !== decodedTokenUsername) {
              console.warn(
                'REFRESH TOKEN auth-controller >>',
                `Found token ${foundTokenUsername} and decoded token ${decodedTokenUsername} don't match!`
              );

              return new APIError(
                ErrCode.PermissionDenied,
                "Tokens don't match!"
              );
            }

            // Refresh token is still valid
            const userRole = await model.userRole.findOne({
              where: { id: foundToken.User.roleId },
              attributes: ['role']
            });
            const accessToken = jwt.sign(
              {
                UserInfo: {
                  id: decodedToken.UserInfo.id,
                  username: decodedToken.UserInfo.username,
                  role: userRole?.role
                }
              },
              'session_jwt',
              { expiresIn: '15m' }
            );
            const newRefreshToken = jwt.sign(
              {
                UserInfo: {
                  id: decodedToken.UserInfo.id,
                  username: decodedToken.UserInfo.username
                }
              },
              'session_token',
              { expiresIn: '1d' }
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
        }
      );

      const foundTokens = jwt.verify(
        refreshToken,
        `${process.env.REFRESH_TOKEN_SECRET}`
      ) as (string | jwt.JwtPayload) & RefreshDecoded;
      if (!foundTokens)
        throw APIError.permissionDenied('Invalid refresh token!');
      const decodedUsername = foundTokens.UserInfo.username;
    } catch (error) {
      const [err] = catchError('REFRESH TOKEN auth-controller', error);
      throw err;
    }
  },
  async logout({ refreshToken }: RefreshTokenReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      await model.token.destroy({
        where: { refresh: refreshToken }
      });

      return;
    } catch (error) {
      const [err] = catchError('LOGOUT auth-controller', error);
      throw err;
    }
  },
  async checkUsername({ refreshToken }: RefreshTokenReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const foundToken = (await model.token.findByPk(refreshToken.value, {
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
