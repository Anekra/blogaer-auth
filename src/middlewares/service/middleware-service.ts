import { APIError, ErrCode, MiddlewareRequest, Next } from 'encore.dev/api';
import rabbitmqChannel from '../../messaging/channel/rabbitmq-channel';

const middlewareService = {
  async initRpcChan(req: MiddlewareRequest, next: Next) {
    console.log('INIT RPC CHAN MW');
    const rpcPubChan = await rabbitmqChannel.rpcPubChan();
    const rpcConChan = await rabbitmqChannel.rpcConChan();
    if (!rpcPubChan || !rpcConChan) {
      console.log("INIT RPC CHAN middleware-service >> Failed to create channels!");

      throw new APIError(
        ErrCode.Internal,
        'Failed to initialize rpc channels!'
      );
    }
    req.data.rpcPubChan = rpcPubChan;
    req.data.rpcConChan = rpcConChan;

    return await next(req);
  },
  async initTopiChan(req: MiddlewareRequest, next: Next) {
    console.log('INIT TOPIC CHAN MW');
    const topicPubChan = await rabbitmqChannel.topicPubChan();
    if (!topicPubChan) {
      console.log("INIT TOPIC CHAN middleware-service >> Failed to create channels!");

      throw new APIError(
        ErrCode.Internal,
        'Failed to initialize rpc channels!'
      );
    }
    req.data.topicPubChan = topicPubChan;

    return await next(req);
  }
};

export default middlewareService;
