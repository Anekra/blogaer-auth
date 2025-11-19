import * as crypto from 'crypto';
import { type DataTypes, type Model, Op, type Sequelize } from 'sequelize';
import { getMainModel } from '../utils/helper';
import type { MainModel } from './main-model';

interface TokenModel {
	refresh: string;
	access: string;
	userId: string;
	clientId: string;
	loginWith?: string;
	csrf?: string;
	userAgent: string;
	ipAddress: string;
	revoked: boolean;
	refreshExp?: typeof DataTypes.DATE;
	accessExp?: typeof DataTypes.DATE;
	createdAt?: typeof DataTypes.DATE;
	updatedAt?: typeof DataTypes.DATE;
}

interface Token extends Model<TokenModel>, TokenModel {}

type TokenStatic = typeof Model & {
	new (values?: Record<string, unknown>, options?: any): Token;
	associate: (model: MainModel) => void;
};

const Token = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
	const token = sequelize.define<Token>(
		'Token',
		{
			refresh: {
				allowNull: false,
				primaryKey: true,
				unique: true,
				type: dataTypes.STRING
			},
			access: {
				allowNull: false,
				unique: true,
				type: dataTypes.STRING
			},
			userId: {
				allowNull: false,
				type: dataTypes.UUID
			},
			clientId: {
				allowNull: false,
				type: dataTypes.STRING
			},
			loginWith: {
				allowNull: false,
				defaultValue: 'credentials',
				type: dataTypes.STRING
			},
			csrf: {
				defaultValue: crypto.randomBytes(32).toString('hex'),
				type: dataTypes.STRING
			},
			userAgent: {
				type: dataTypes.STRING
			},
			ipAddress: {
				type: dataTypes.STRING
			},
			revoked: {
				type: dataTypes.BOOLEAN
			},
			refreshExp: {
				defaultValue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				type: dataTypes.DATE
			},
			accessExp: {
				defaultValue: new Date(Date.now() + 15 * 60 * 1000),
				type: dataTypes.DATE
			},
			createdAt: {
				type: dataTypes.DATE
			},
			updatedAt: {
				type: dataTypes.DATE
			}
		},
		{
			tableName: 'tokens',
			underscored: true,
			hooks: {
				async afterCreate(attributes, _) {
					console.log(
						`AFTER CREATE token >> userId: ${attributes.userId} has Logged in.`
					);

					const { token } = await getMainModel();
					if ((await token.count()) > 1) {
						const { count } = await token.findAndCountAll({
							where: { clientId: attributes.clientId }
						});
						if (count > 1) {
							await token.destroy({
								where: {
									clientId: attributes.clientId,
									refresh: { [Op.ne]: attributes.refresh }
								}
							});
						}

						const aWeekAgo = new Date();
						aWeekAgo.setDate(aWeekAgo.getDate() - 7);
						token.destroy({
							where: {
								updatedAt: {
									[Op.lt]: aWeekAgo
								}
							}
						});
					}

					return;
				},
				afterDestroy(instance, _) {
					console.log(
						`AFTER DESTROY token >> (userId: ${instance.userId} | clientId: ${instance.clientId}) has Logged out.`
					);

          return;
				}
			}
		}
	) as TokenStatic;

	token.associate = (model: MainModel) => {
		if (model.user) {
			token.belongsTo(model.user, {
				foreignKey: 'user_id',
				targetKey: 'id'
			});
		}
	};

	return token;
};

export default Token;
