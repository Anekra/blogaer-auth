import type { DataTypes, Model, Sequelize } from 'sequelize';
import type { MainModel } from './main-model';

interface UserModel {
	id?: string;
	username: string;
	email: string;
	password?: string;
	name?: string;
	description?: string;
	picture?: string;
	banner?: string;
	roleId: number;
	verified?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

interface User extends Model<UserModel>, UserModel {
	removeSavedAccount: (
		savedAccount: unknown,
		options?: unknown
	) => Promise<unknown>;
}

type UserStatic = typeof Model & {
	new (values?: Record<string, unknown>, options?: unknown): User;
	associate: (model: MainModel) => void;
};

const User = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
	const user = sequelize.define<User>(
		'User',
		{
			id: {
				allowNull: false,
				primaryKey: true,
				unique: true,
				type: dataTypes.UUID,
				defaultValue: dataTypes.UUIDV4
			},
			username: {
				allowNull: false,
				unique: true,
				type: dataTypes.STRING
			},
			email: {
				allowNull: false,
				unique: true,
				type: dataTypes.STRING
			},
			password: {
				allowNull: true,
				type: dataTypes.STRING
			},
			name: {
				allowNull: true,
				type: dataTypes.STRING
			},
			description: {
				allowNull: true,
				type: dataTypes.STRING
			},
			picture: {
				allowNull: true,
				type: dataTypes.STRING
			},
			banner: {
				allowNull: true,
				type: dataTypes.STRING
			},
			roleId: {
				allowNull: false,
				type: dataTypes.TINYINT,
				defaultValue: 2
			},
			verified: {
				type: dataTypes.BOOLEAN,
				defaultValue: false
			},
			createdAt: {
				type: dataTypes.DATE
			},
			updatedAt: {
				type: dataTypes.DATE
			}
		},
		{
			tableName: 'users',
			underscored: true,
			paranoid: true,
			hooks: {
				afterCreate(user) {
					console.log(
						`AFTER CREATE user >> ${user.email} has been REGISTERED.`
					);

					return;
				}
			}
		}
	) as UserStatic;

	user.associate = (model: MainModel) => {
		user.hasMany(model.token, {
			foreignKey: 'user_id'
		});

		user.belongsToMany(model.savedAccount, {
			through: 'user_saved_accounts',
			timestamps: false,
			onDelete: 'cascade'
		});

		user.belongsTo(model.userRole, {
			foreignKey: 'role_id',
			targetKey: 'id'
		});

		user.hasMany(model.userOauth, {
			foreignKey: 'user_id'
		});

		user.hasMany(model.userSocial, {
			foreignKey: 'user_id'
		});

		user.hasMany(model.userPasskey, {
			foreignKey: 'user_id'
		});

		user.hasMany(model.userRequest, {
			foreignKey: 'user_id'
		});

		user.hasOne(model.userTotpSecret);

		user.hasOne(model.userSetting);
	};

	return user;
};

export default User;
