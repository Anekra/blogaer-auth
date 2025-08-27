import modelMiddleware from '../../middlewares/model-middleware';
import rabbitMQMiddleware from '../../middlewares/rabbitmq-middleware';
import userMiddleware from '../../middlewares/user-middleware';
import { Service } from 'encore.dev/service';

const models = Object.values(modelMiddleware);
const rabbits = Object.values(rabbitMQMiddleware);
const author = userMiddleware.verifyAuthor;

export default new Service('draft-service', {
  middlewares: [...models, ...rabbits, author]
});
