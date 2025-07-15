import { Service } from 'encore.dev/service';
import modelMiddleware from '../../../middlewares/model-middleware';
import authMiddleware from '../../../middlewares/auth-middleware';
import rabbitMQMiddleware from '../../../middlewares/rabbitmq-middleware';

const model = modelMiddleware.main;
const auth = authMiddleware.verifyOauthCode;
const rabbit = rabbitMQMiddleware.initRpcChan;

export default new Service('oauth-service', { middlewares: [model, auth, rabbit] });
