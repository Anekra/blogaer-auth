import modelMiddleware from '../../middlewares/model-middleware';
import authMiddleware from '../../middlewares/auth-middleware';
import rabbitMQMiddleware from '../../middlewares/rabbitmq-middleware';
import userMiddleware from '../../middlewares/user-middleware';
import { Service } from 'encore.dev/service';

const models = Object.values(modelMiddleware);
const auths = [
  authMiddleware.verifyRefreshToken,
  authMiddleware.verifyAccessToken
];
const rabbits = Object.values(rabbitMQMiddleware);
const author = userMiddleware.verifyAuthor;

export default new Service('post-service', {
  middlewares: [...models, ...auths, ...rabbits, author]
});
