import { CronJob } from 'encore.dev/cron';
import initMainModel from '../../../../models/main-model';
import { Op } from 'sequelize';

export async function deleteToken() {
	console.log('DELETE TOKEN token-job >> Starting revoked token clean up...');

	try {
		const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
		const model = await initMainModel;
		const deletedCount = await model.token.destroy({
			where: {
				revoked: true,
				deletedAt: {
					[Op.lt]: oneMinuteAgo
				}
			}
		});

		if (deletedCount > 0) {
			console.log(
				`DELETE TOKEN token-job >> Permanently deleted ${deletedCount} revoked token(s).`
			);
		} else {
			console.log('DELETE TOKEN token-job >> No stale tokens found to delete.');
		}
	} catch (error) {
		console.error('DELETE TOKEN token-job >> Failed to cleanup tokens:', error);
		throw error;
	}
}

const _ = new CronJob('delete-revoked-tokens', {
	title: 'Delete revoked tokens',
	every: '1h',
	endpoint: deleteToken
});
