import amqp from 'amqplib';

let rabbitMQConnPromise: Promise<amqp.ChannelModel | null> | null = null;

async function attemptConnection(
  retries: number = 0
): Promise<amqp.ChannelModel | null> {
  try {
    const connection = await amqp.connect(`${process.env.RABBITMQ_URL}`);
    connection.on('close', () => {
      console.warn(
        'ATTEMPT CONNECTION rabbitmq-connection >> ',
        'Consumer channel closed. Will re-initialize on next access.'
      );
      rabbitMQConnPromise = null;
    });
    connection.on('error', (err) => {
      console.error(
        'ATTEMPT CONNECTION rabbitmq-connection >> ',
        'Consumer rpc channel error:',
        err
      );
      rabbitMQConnPromise = null;
    });
    console.log('Connected to rabbitmq ✔✔✔');

    return connection;
  } catch (error) {
    console.error(
      'Failed to connect to RabbitMQ:',
      retries < 5
        ? 'Retrying in 60 seconds!'
        : 'Max retries have been reached! ✘✘✘'
    );
    console.error(error);
    if (retries >= 5) {
      rabbitMQConnPromise = null;
      console.error(
        'ATTEMPT CONNECTION rabbitmq-connection >> ',
        error instanceof Error
          ? `Failed to connect to RabbitMQ after multiple attempts! ${error.message}`
          : 'Failed to connect to RabbitMQ after multiple attempts!'
      );

      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 60000));
    rabbitMQConnPromise = null;
    attemptConnection(retries + 1);

    return null;
  }
}

async function connectToRabbitMQ(): Promise<amqp.ChannelModel | null> {
  if (!rabbitMQConnPromise) rabbitMQConnPromise = attemptConnection();

  return rabbitMQConnPromise;
}

export default connectToRabbitMQ();
