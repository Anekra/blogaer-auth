import type { IncomingMessage, ServerResponse } from 'http';
import type { Channel } from 'amqplib';
import { type APICallMeta, currentRequest } from 'encore.dev';
import { APIError, ErrCode } from 'encore.dev/api';
import type { PagedPostDto } from '../../../types/dto/PagedPostDto';
import type { PostDto } from '../../../types/dto/PostDto';
import type { AddPostReq, PatchPostReq } from '../../../types/request';
import { ExchangeName } from '../../../utils/enums';
import {
	catchError,
	closeChannel,
	errCodeToHttpStatus,
	getAllUserImgsAndUsernames,
	getAuth,
	getLastPath,
	getUserById,
	parseJsonBody
} from '../../../utils/helper';

const postController = {
	async getPostsByPage(req: IncomingMessage, res: ServerResponse) {
		const url = new URL(`${req.headers.origin}${req.url}`);
		const params = url.searchParams;
		const number = params.get('number') ?? 1;
		const size = params.get('size') ?? 10;
		// const query = params.get('query');
		// const categories = params.get('categories');
		// const tags = params.get('tags');
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		try {
			const message = Buffer.from(JSON.stringify({ number, size }));
			const userList = await getAllUserImgsAndUsernames();
			if (!userList) throw new Error('Database connection failed!');

			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false,
				autoDelete: true
			});

			const correlationId = crypto.randomUUID();
			rpcPubChan.publish(ExchangeName.Rpc, 'post.get.by.page.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			const timeout = setTimeout(() => {
				console.warn('GET POSTS BY PAGE auth-controller >> Request timeout!');

				const err = APIError.deadlineExceeded(
					'Server took too long to respond!'
				);
				res.statusCode = errCodeToHttpStatus(err.code);
				res.setHeader('Content-Type', 'application/json');
				res.end(
					JSON.stringify({
						code: err.code,
						message: err.message
					})
				);
				closeChannel(timeout, rpcConChan);
			}, 10000);

			await rpcConChan.consume(
				queue,
				async (msg) => {
					if (msg) {
						if (msg.properties.correlationId !== correlationId) return null;

						const data: PagedPostDto = JSON.parse(msg.content.toString());
						if (data.posts.length > 0) {
							const posts = data.posts.map((post) => {
								const foundUser = userList.find(
									(user) => user.id === post.userId
								);
								delete post?.userId;
								if (foundUser) {
									return {
										...post,
										username: foundUser.username,
										userImg: foundUser.picture
									};
								}

								return post;
							});
							data.posts = posts;
						}

						res.statusCode = 200;
						res.setHeader('Content-Type', 'application/json');
						res.end(
							JSON.stringify({
								status: 'Success',
								data
							})
						);
						closeChannel(timeout, rpcConChan);
					} else {
						console.warn(
							'GET POSTS BY PAGE auth-controller >> Message is empty!'
						);

						throw new APIError(ErrCode.Internal, 'Get posts by page failed!');
					}
				},
				{ noAck: true }
			);
		} catch (error) {
			const [err, errMsg] = catchError(
				'GET POSTS BY PAGE auth-controller',
				error
			);

			res.statusCode =
				err instanceof APIError ? errCodeToHttpStatus(err.code) : 500;
			res.setHeader('Content-Type', 'application/json');
			res.end({
				status: ErrCode.Internal,
				error: errMsg
			});
			await rpcConChan.close();
			throw err;
		}
	},
	async getPostById(req: IncomingMessage, res: ServerResponse) {
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		try {
			const id = getLastPath(req.url);
			if (!id) {
				console.warn(
					'GET POST BY ID post-controller >> Missing post id in the request!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'Missing post id in the request!'
				);
			}
			const message = Buffer.from(JSON.stringify(id));
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});
			const correlationId = crypto.randomUUID();
			rpcPubChan.publish(ExchangeName.Rpc, 'post.get.by.id.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			const timeout = setTimeout(() => {
				console.warn('GET POSTS BY ID post-controller >> Request timeout!');

				throw new APIError(
					ErrCode.DeadlineExceeded,
					'Server took too long to respond!'
				);
			}, 10000);

			await rpcConChan.consume(
				queue,
				async (msg) => {
					if (msg) {
						if (msg.properties.correlationId !== correlationId) return;

						const post: PostDto = JSON.parse(msg.content.toString());
						if (!post || !post.userId) return;

						const user = await getUserById(post.userId);
						delete post.userId;
						const data = {
							...post,
							username: user?.username,
							userImg: user?.picture
						};

						res.statusCode = 200;
						res.setHeader('Content-Type', 'application/json');
						res.end(
							JSON.stringify({
								status: 'Success',
								data
							})
						);
						await closeChannel(timeout, rpcConChan);
					} else {
						console.warn('GET POST BY ID post-controller >> Message is empty!');
						throw new APIError(ErrCode.Internal, 'Get post by id failed!');
					}
				},
				{ noAck: true }
			);
		} catch (error) {
			const [err, errMsg] = catchError('GET POST BY ID post-controller', error);

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
	async getPostsByUserId(req: IncomingMessage, res: ServerResponse) {
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		try {
			const authData = getAuth();
			const userId = authData.userID;
			const protocol =
				req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
			const host = req.headers.host ?? 'localhost';
			const url = new URL(req.url ?? '/', `${protocol}://${host}`);
			const query = url.searchParams;
			const number = query.get('number') || 1;
			const size = query.get('size') || 5;
			const message = Buffer.from(JSON.stringify({ userId, number, size }));
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});

			const correlationId = crypto.randomUUID();
			rpcPubChan.publish(ExchangeName.Rpc, 'post.get.by.user.id.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			const timeout = setTimeout(() => {
				console.warn(
					'GET POSTS BY USER ID post-controller >> Request timeout!'
				);

				throw new APIError(
					ErrCode.DeadlineExceeded,
					'Server took too long to respond!'
				);
			}, 5000);

			await rpcConChan.consume(
				queue,
				async (msg) => {
					if (msg) {
						if (msg.properties.correlationId !== correlationId) return;

						const data: PagedPostDto = JSON.parse(msg.content.toString());
						const posts = data.posts.map((post) => {
							delete post?.userId;
							return post;
						});
						data.posts = posts;

						res.statusCode = 200;
						res.setHeader('Content-Type', 'application/json');
						res.end(
							JSON.stringify({
								status: 'Success',
								data
							})
						);
						await closeChannel(timeout, rpcConChan);
					} else {
						console.warn(
							'GET POSTS BY USER ID post-controller >> Message is empty!'
						);

						throw new APIError(
							ErrCode.Internal,
							'Get posts by user id failed!'
						);
					}
				},
				{ noAck: true }
			);
		} catch (error) {
			const [err, errMsg] = catchError(
				'GET POSTS BY USER ID post-controller',
				error
			);

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
	async addPost(req: IncomingMessage, res: ServerResponse) {
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		try {
			const authData = getAuth();
			const userId = authData.userID;
			const { title, text, content, tags } =
				await parseJsonBody<AddPostReq>(req);
			const message = Buffer.from(
				JSON.stringify({ userId, text, title: title.trim(), content, tags })
			);
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});

			const correlationId = crypto.randomUUID();
			rpcPubChan.publish(ExchangeName.Rpc, 'post.add.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			const timeout = setTimeout(() => {
				console.warn('ADD POST post-controller >> Request timeout!');

				throw new APIError(
					ErrCode.DeadlineExceeded,
					'Server took too long to respond!'
				);
			}, 5000);

			await rpcConChan.consume(
				queue,
				async (msg) => {
					if (msg) {
						if (msg.properties.correlationId !== correlationId) return;

						const id: string = JSON.parse(msg.content.toString());
						if (!id) {
							console.warn('ADD POST post-controller >> Adding post failed!');

							throw new APIError(ErrCode.Internal, 'Adding post failed!');
						}

						res.statusCode = 200;
						res.setHeader('Content-Type', 'application/json');
						res.end({
							status: 'Success',
							data: { id }
						});
						await closeChannel(timeout, rpcConChan);
					} else {
						console.warn('ADD POST post-controller >> Message is empty!');
						throw new APIError(ErrCode.Internal, 'Add post failed!');
					}
				},
				{ noAck: true }
			);
		} catch (error) {
			const [err, errMsg] = catchError('ADD POST post-controller', error);

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
	async patchPost(req: IncomingMessage, res: ServerResponse) {
		try {
			const callMeta = currentRequest() as APICallMeta;
			const topicPubChan = callMeta.middlewareData?.topicPubChan;
			const { id, title, text, content, tags } =
				await parseJsonBody<PatchPostReq>(req);
			const message = Buffer.from(
				JSON.stringify({ id, title: title.trim(), text, content, tags })
			);
			const isPublished = topicPubChan.publish(
				ExchangeName.Topic,
				'post.patch.key',
				message,
				{
					persistent: false
				}
			);
			if (isPublished) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end({ status: 'Success', message: 'Saving post...' });
			} else {
				console.warn('PATCH POST post-controller >> Patch post failed!');
				throw new APIError(ErrCode.Internal, 'Patch post failed!');
			}
		} catch (error) {
			const [err, errMsg] = catchError('PATCH POST post-controller', error);

			res.statusCode =
				err instanceof APIError ? errCodeToHttpStatus(err.code) : 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					status: ErrCode.Internal,
					error: errMsg
				})
			);
			throw err;
		}
	},
	async deletePost(req: IncomingMessage, res: ServerResponse) {
		try {
			const id = getLastPath(req.url);
			if (!id) {
				console.warn(
					'DELETE POST post-controller >> Missing post id in the request!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'Missing post id in the request!'
				);
			}
			const message = Buffer.from(JSON.stringify(id));
			const callMeta = currentRequest() as APICallMeta;
			const topicPubChan = callMeta.middlewareData?.topicPubChan as Channel;
			const isPublished = topicPubChan.publish(
				ExchangeName.Topic,
				'post.delete.key',
				message,
				{
					persistent: false
				}
			);
			if (isPublished) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end({ status: 'Success', message: 'Deleting post...' });
			} else {
				console.warn('DELETE POST post-controller >> Delete post failed!');
				throw new APIError(ErrCode.Internal, 'Delete post failed!');
			}
		} catch (error) {
			const [err, errMsg] = catchError('DELETE POST post-controller', error);

			res.statusCode =
				err instanceof APIError ? errCodeToHttpStatus(err.code) : 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					status: ErrCode.Internal,
					error: errMsg
				})
			);
			throw err;
		}
	}
};

export default postController;
