import { APICallMeta, currentRequest } from 'encore.dev';
import { IncomingMessage, ServerResponse } from 'http';
import { Channel } from 'amqplib';
import { MainModel } from '../../../../models/main-model';
import { nanoid } from 'nanoid';
import { ExchangeName, OauthProvider } from '../../../../utils/enums';
import { APIError, ErrCode } from 'encore.dev/api';
import {
  catchError,
  closeChannel,
  errCodeToHttpStatus,
  generateClientId,
  generateRandomChars
} from '../../../../utils/helper';
import jwtService from '../../auth/services/jwt-service';

const oauthController = {
  async google(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const callMeta = currentRequest() as APICallMeta;
    const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
    const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    const code = callMeta.middlewareData?.oauthCode as string;

    try {
      const { queue } = await rpcConChan.assertQueue('', {
        exclusive: true,
        durable: false
      });
      const correlationId = nanoid(9);
      const message = Buffer.from(JSON.stringify({ code }));
      rpcPubChan.publish(ExchangeName.Rpc, 'oauth.google.key', message, {
        persistent: false,
        replyTo: queue,
        correlationId
      });
      const timeout = setTimeout(() => {
        console.warn('GOOGLE auth-controller >> Request timeout!');
        throw new APIError(ErrCode.DeadlineExceeded, 'Request timeout!');
      }, 5000);
      await rpcConChan.consume(queue, async (msg) => {
        if (msg) {
          if (msg.properties.correlationId !== correlationId) return;

          const userInfo = JSON.parse(msg.content.toString());
          const [user, isCreated] = await model.user.findOrCreate({
            where: {
              email: userInfo.email
            },
            defaults: {
              username: userInfo.given_name + generateRandomChars(4),
              name: userInfo.given_name,
              email: userInfo.email,
              picture: userInfo.picture,
              verified: true
            }
          });

          if (isCreated && user.id) {
            await model.userOauth.create({
              userId: user.id,
              oauthProvider: OauthProvider.Google,
              oauthEmail: user.email
            });
          }

          const [accessToken, newRefreshToken] = await jwtService.generateJwt(
            user.username,
            user.roleId,
            user.id
          );

          const { clientId } = generateClientId(req.headers['user-agent']);
          if (clientId) {
            await model.refreshToken.create({
              token: newRefreshToken,
              userId: `${user.id}`,
              loginWith: OauthProvider.Google,
              clientId
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                status: 'Success',
                data: {
                  username: user.username,
                  name: user.name,
                  email: user.email,
                  desc: user.description,
                  role: user.roleId === 2 ? 'Author' : 'Admin',
                  img: user.picture,
                  access: accessToken,
                  refresh: newRefreshToken
                }
              })
            );
            rpcConChan.ack(msg);
            await closeChannel(timeout, rpcConChan);
          } else {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                status: ErrCode.InvalidArgument,
                error: 'User agent is invalid!'
              })
            );
            rpcConChan.nack(msg);
            await closeChannel(timeout, rpcConChan);
          }
        } else {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              status: ErrCode.Internal,
              error: 'Google login failed! No user info content.'
            })
          );
          await closeChannel(timeout, rpcConChan);
        }
      });
    } catch (error) {
      const [err, errMsg] = catchError('GOOGLE oauth-controller', error);

      res.statusCode =
        err instanceof APIError ? errCodeToHttpStatus(err.code) : 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: ErrCode.Internal,
          error: errMsg
        })
      );
      await rpcConChan.close();
      throw err;
    }
  },
  async github(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const callMeta = currentRequest() as APICallMeta;
    const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
    const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    const code = callMeta.middlewareData?.oauthCode as string;
    try {
      const { queue } = await rpcConChan.assertQueue('', {
        exclusive: true,
        durable: false
      });
      const correlationId = nanoid(9);
      const message = Buffer.from(JSON.stringify({ code }));
      rpcPubChan.publish(ExchangeName.Rpc, 'oauth.github.key', message, {
        persistent: false,
        replyTo: queue,
        correlationId
      });
      const timeout = setTimeout(() => {
        console.warn('GITHUB auth-controller >> Request timeout!');
        throw new APIError(ErrCode.DeadlineExceeded, 'Request timeout!');
      }, 5000);
      await rpcConChan.consume(queue, async (msg) => {
        if (msg) {
          if (msg.properties.correlationId !== correlationId) return;

          const userData = JSON.parse(msg.content.toString());
          const userInfo = userData.userInfo;
          const userEmail = userData.userEmail.email;
          const name = (userInfo.name as string).split(' ')[0];
          const [user] = await model.user.findOrCreate({
            where: {
              email: userEmail
            },
            defaults: {
              username: name + generateRandomChars(4),
              name,
              email: userEmail,
              picture: userInfo.avatar_url,
              verified: userEmail ? true : false
            }
          });
          if (user.id) {
            await model.userOauth.findOrCreate({
              where: {
                userId: user.id,
                oauthProvider: OauthProvider.Github,
                oauthEmail: user.email
              }
            });
          }
          const [accessToken, newRefreshToken] = await jwtService.generateJwt(
            user.username,
            user.roleId,
            user.id
          );
          const { clientId } = generateClientId(req.headers['user-agent']);
          if (clientId) {
            await model.refreshToken.create({
              token: newRefreshToken,
              userId: `${user.id}`,
              loginWith: OauthProvider.Github,
              clientId
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end({
              status: 'Success',
              data: {
                username: user.username,
                name: user.name,
                email: user.email,
                desc: user.description,
                role: user.roleId === 2 ? 'Author' : 'Admin',
                img: user.picture,
                access: accessToken,
                refresh: newRefreshToken
              }
            });
          }
        } else {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: ErrCode.Internal,
              error: 'Github login failed! No user info content.'
            })
          );
          await closeChannel(timeout, rpcConChan);
        }
      });
    } catch (error) {
      const [err, errMsg] = catchError('GITHUB oauth-controller', error);

      res.statusCode =
        err instanceof APIError ? errCodeToHttpStatus(err.code) : 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: ErrCode.Internal,
          error: errMsg
        })
      );
      await rpcConChan.close();
      throw err;
    }
  }
};

export default oauthController;
