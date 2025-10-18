import amqp from 'amqplib';
import attemptConnection from '../connection/rabbitmq-connection';

const channelMap: Map<string, Promise<amqp.Channel | null>> = new Map();

const msgService = {
  async initChannel(
    channelName: string,
    exchangeName: string,
    exchangeType: string
  ): Promise<amqp.Channel | null> {
    if (channelMap.has(channelName)) {
      const channel = channelMap.get(channelName);
      if (channel) return channel;
      console.warn(
        `msg-service >> ${channelName} -`,
        'Channel initialization failed!'
      );
      return null;
    }

    const channelPromise = (async (): Promise<amqp.Channel | null> => {
      let channel: amqp.Channel | null = null;
      try {
        const connection = await attemptConnection;
        if (!connection) return null;
        channel = await connection.createChannel();
        channel.on('close', () => {
          console.warn(
            `msg-service >> ${channelName} -`,
            'Channel closed. Will re-initialize on next access.'
          );
          channelMap.delete(channelName);
        });
        channel.on('error', (err) => {
          console.error(
            `msg-service >> ${channelName} -`,
            err instanceof Error ? err.message : 'Channel error occur!'
          );
          channelMap.delete(channelName);
        });

        return channel;
      } catch (error) {
        console.error(
          `msg-service >> ${channelName} -`,
          error instanceof Error ? error.message : 'Creating channel failed!'
        );
        channelMap.delete(channelName);

        return null;
      }
    })();

    return channelPromise;
  }
};

export default msgService;
