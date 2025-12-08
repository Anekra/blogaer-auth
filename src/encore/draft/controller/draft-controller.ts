import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Channel } from 'amqplib';
import { type APICallMeta, currentRequest } from 'encore.dev';
import { APIError, ErrCode } from 'encore.dev/api';
import type { DraftDto } from '../../../types/dto/DraftDto';
import type { PagedDraftDto } from '../../../types/dto/PagedDraftDto';
import type { AddDraftReq, PatchDraftReq } from '../../../types/request';
import { ExchangeName } from '../../../utils/enums';
import {
	catchError,
	closeChannel,
	errCodeToHttpStatus,
	getAuth,
	getLastPath,
	getUserById,
	parseJsonBody
} from '../../../utils/helper';

const draftController = {
	async getDraftsByUserId(req: IncomingMessage, res: ServerResponse) {
		console.log('GET DRAFTS BY USER ID');
		const url = new URL(`${req.headers.origin}${req.url}`);
		const params = url.searchParams;
		const page = params.get('page') ?? 1;
		const size = params.get('size') ?? 10;
		// const query = params.get('query');
		const callMeta = currentRequest() as APICallMeta;
		const authData = getAuth();
		const userId = authData.userID;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		try {
			const message = Buffer.from(JSON.stringify({ page, size, userId }));
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});
			const correlationId = crypto.randomUUID();
			rpcPubChan.publish(
				ExchangeName.Rpc,
				'draft.get.by.user.id.key',
				message,
				{
					persistent: false,
					replyTo: queue,
					correlationId
				}
			);
			const timeout = setTimeout(() => {
				console.warn(
					'GET DRAFTS BY USER ID draft-controller >> Request timeout!'
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

						const data: PagedDraftDto = JSON.parse(msg.content.toString());
						if (!data) {
							res.statusCode = 404;
							res.setHeader('Content-Type', 'application/json');

							return res.end();
						}

						const drafts = data.drafts.map((draft) => {
							delete draft?.userId;
							return draft;
						});
						data.drafts = drafts;

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
							'GET DRAFTS BY USER ID draft-controller >> Message is empty!'
						);

						throw new APIError(
							ErrCode.Internal,
							'Get drafts by user id failed!'
						);
					}
				},
				{ noAck: true }
			);
		} catch (error) {
			const [err, errMsg] = catchError(
				'GET DRAFTS BY USER ID draft-controller',
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
			throw err;
		}
	},
	async getDraftById(req: IncomingMessage, res: ServerResponse) {
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		try {
			const id = getLastPath(req.url);
			console.log('GET DRAFT BY ID >>', id);
			if (!id) {
				console.warn(
					'GET DRAFT BY ID draft-controller >> Missing draft id in the request!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'Missing draft id in the request!'
				);
			}
			const message = Buffer.from(JSON.stringify(id));
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});

			const correlationId = crypto.randomUUID();
			rpcPubChan.publish(ExchangeName.Rpc, 'draft.get.by.id.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			const timeout = setTimeout(() => {
				console.warn('GET DRAFT BY ID draft-controller >> Request timeout!');

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

						const draft: DraftDto = JSON.parse(msg.content.toString());
						if (!draft.userId) {
							res.statusCode = 404;
							res.setHeader('Content-Type', 'application/json');

							return res.end();
						}

						const user = await getUserById(draft.userId);
						delete draft.userId;
						const data = {
							...draft,
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
						console.warn(
							'GET DRAFT BY ID draft-controller >> Message is empty!'
						);

						throw new APIError(ErrCode.Internal, 'Get draft by id failed!');
					}
				},
				{ noAck: true }
			);
		} catch (error) {
			const [err, errMsg] = catchError(
				'GET DRAFT BY ID draft-controller',
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
	async addDraft(req: IncomingMessage, res: ServerResponse) {
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		try {
			const authData = getAuth();
			const userId = authData.userID;
			const { title, text, content } = await parseJsonBody<AddDraftReq>(req);
			const message = Buffer.from(
				JSON.stringify({ userId, title: title.trim(), text, content })
			);
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});

			const correlationId = crypto.randomUUID();
			rpcPubChan.publish(ExchangeName.Rpc, 'draft.add.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			const timeout = setTimeout(() => {
				console.warn('ADD DRAFT draft-controller >> Request timeout!');

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
							console.warn(
								'ADD DRAFT draft-controller >> Adding draft failed!'
							);
							throw new APIError(ErrCode.Internal, 'Adding draft failed!');
						}

						res.statusCode = 200;
						res.setHeader('Content-Type', 'application/json');
						res.end({
							status: 'Success',
							data: { id }
						});
						await closeChannel(timeout, rpcConChan);
					} else {
						console.warn('ADD DRAFT draft-controller >> Message is empty!');
						throw new APIError(ErrCode.Internal, 'Add draft failed!');
					}
				},
				{ noAck: true }
			);
		} catch (error) {
			const [err, errMsg] = catchError('ADD DRAFT draft-controller', error);

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
	async patchDraft(req: IncomingMessage, res: ServerResponse) {
		try {
			const callMeta = currentRequest() as APICallMeta;
			const topicPubChan = callMeta.middlewareData?.topicPubChan;
			const { id, title, text, content } =
				await parseJsonBody<PatchDraftReq>(req);
			const message = Buffer.from(
				JSON.stringify({ id, title: title.trim(), text, content })
			);
			const isPublished = topicPubChan.publish(
				ExchangeName.Topic,
				'draft.patch.key',
				message,
				{
					persistent: false
				}
			);
			if (isPublished) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end({ status: 'Success', message: 'Saving draft...' });
			} else {
				console.warn('PATCH DRAFT draft-controller >> Patch draft failed!');
				throw new APIError(ErrCode.Internal, 'Patch draft failed!');
			}
		} catch (error) {
			const [err, errMsg] = catchError('PATCH DRAFT draft-controller', error);

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
	async deleteDraft(req: IncomingMessage, res: ServerResponse) {
		try {
			const id = getLastPath(req.url);
			if (!id) {
				console.warn(
					'DELETE DRAFT draft-controller >> Missing draft id in the request!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'Missing draft id in the request!'
				);
			}
			const message = Buffer.from(JSON.stringify(id));
			const callMeta = currentRequest() as APICallMeta;
			const topicPubChan = callMeta.middlewareData?.topicPubChan as Channel;
			const isPublished = topicPubChan.publish(
				ExchangeName.Topic,
				'draft.delete.key',
				message,
				{
					persistent: false
				}
			);
			if (isPublished) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end({ status: 'Success', message: 'Deleting draft...' });
			} else {
				console.warn('DELETE DRAFT draft-controller >> Delete draft failed!');
				throw new APIError(ErrCode.Internal, 'Delete draft failed!');
			}
		} catch (error) {
			const [err, errMsg] = catchError('DELETE DRAFT draft-controller', error);

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

export default draftController;
