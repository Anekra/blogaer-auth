import { APIError, ErrCode, middleware } from 'encore.dev/api';
import { catchError, parseCookies } from '../utils/helper';
import jwt from 'jsonwebtoken';
import { Decoded } from '../types';

const authMiddleware = {
  verifyOauthCode: middleware(
    {
      target: {
        auth: false,
        tags: ['verify-oauth-code']
      }
    },
    async (req, next) => {
      const header = req.rawRequest?.headers.authorization;
      if (!header?.startsWith('Oauth2')) {
        console.warn(
          "VERIFY OAUTH CODE auth-middleware >> Auth code doesn't start with Oauth2!"
        );

        throw new APIError(
          ErrCode.PermissionDenied,
          "Auth code doesn't start with Oauth2!"
        );
      }
      const code = header.split(' ')[1];
      if (code === 'undefined') {
        console.warn(
          'VERIFY OAUTH CODE auth-middleware >> Auth code is undefined!'
        );

        throw new APIError(ErrCode.PermissionDenied, 'Auth code is undefined!');
      }
      req.data.oauthCode = code;

      return await next(req);
    }
  ),
  verifyRefreshToken: middleware(
    { target: { auth: false, tags: ['verify-refresh-token'] } },
    async (req, next) => {
      console.log('REFRESH TOKEN MW');
      const cookie = parseCookies(req.rawRequest?.headers.cookie);
      const refreshToken = cookie['session_token'];
      if (refreshToken == null) {
        console.warn(
          'VERIFY REFRESH TOKEN auth-middleware >> No refresh token in the request!'
        );

        throw new APIError(
          ErrCode.PermissionDenied,
          'No refresh token in the request!'
        );
      }

      return await next(req);
    }
  ),
  verifyAccessToken: middleware(
    {
      target: {
        auth: false,
        tags: ['verify-access-token']
      }
    },
    async (req, next) => {
      try {
        const cookie = parseCookies(req.rawRequest?.headers.cookie);
        const accessToken = cookie['session_jwt'];
        if (accessToken == null) {
          console.warn(
            'VERIFY ACCESS TOKEN auth-middleware >> No access token in the request!'
          );

          throw new APIError(
            ErrCode.PermissionDenied,
            'No access token in the request!'
          );
        }
        const secret = `${process.env.ACCESS_TOKEN_SECRET}`;
        const decoded = jwt.verify(accessToken, secret) as Decoded;
        if (!decoded) {
          throw new APIError(ErrCode.PermissionDenied, 'Invalid token!');
        }
        req.data.userId = decoded.UserInfo.id;
        req.data.username = decoded.UserInfo.username;
        req.data.role = decoded.UserInfo.role;

        return await next(req);
      } catch (error) {
        const [err] = catchError(
          'VERIFY ACCESS TOKEN auth-middleware',
          error
        );
        throw err;
      }
    }
  )
};

export default authMiddleware;
