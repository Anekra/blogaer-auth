import { ExchangeName, ExchangeType } from '../../utils/enums';
import msgService from '../services/msg-service';

const rabbitmqChannel = {
  async rpcPubChan() {
    return await msgService.initChannel(
      'rpc-publisher-channel',
      ExchangeName.Rpc,
      ExchangeType.Direct,
    );
  },
  async rpcConChan() {
    return await msgService.initChannel(
      'rpc-consumer-channel',
      ExchangeName.Rpc,
      ExchangeType.Direct
    );
  },
  async topicPubChan() {
    return await msgService.initChannel(
      'topic-consumer-channel',
      ExchangeName.Topic,
      ExchangeType.Direct
    );
  }
};

export default rabbitmqChannel;
