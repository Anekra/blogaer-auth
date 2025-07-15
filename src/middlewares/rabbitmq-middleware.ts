import { APIError, ErrCode, middleware } from 'encore.dev/api';
import middlewareService from './service/middleware-service';
import rabbitmqChannel from '../messaging/channel/rabbitmq-channel';

const rabbitMQMiddleware = {
  initRpcChan: middleware(
    { target: { auth: false, tags: ['init-rpc-chan'] } },
    async (req, next) => {
      const rpcPubChan = await rabbitmqChannel.rpcPubChan();
      const rpcConChan = await rabbitmqChannel.rpcConChan();
      if (!rpcPubChan || !rpcConChan) {
        console.log(
          'INIT RPC CHAN rabbitmq-middleware >> Failed to create channels!'
        );

        throw new APIError(
          ErrCode.Internal,
          'Failed to initialize rpc channels!'
        );
      }
      req.data.rpcPubChan = rpcPubChan;
      req.data.rpcConChan = rpcConChan;

      return await next(req);
    }
  ),
  initTopicChan: middleware(
    {
      target: {
        auth: false,
        tags: ['init-topic-chan']
      }
    },
    middlewareService.initTopiChan
  )
};

export default rabbitMQMiddleware;
