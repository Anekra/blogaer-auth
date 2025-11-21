import type { DataTypes, Model, Sequelize } from 'sequelize';
import type { MainModel } from './main-model';
import type User from './user';

interface SavedAccountModel {
	id: string;
	createdAt?: string;
	updatedAt?: string;
}

interface SavedAccount extends Model<SavedAccountModel>, SavedAccountModel {
	addUser: (user: unknown, options?: unknown) => Promise<unknown>;
	getUsers: (options?: unknown) => Promise<User[]>;
	removeUser: (user: unknown, options?: unknown) => Promise<unknown>;
}

type SavedAccountStatic = typeof Model & {
	new (values?: Record<string, unknown>, options?: unknown): SavedAccount;
	associate: (model: MainModel) => void;
};

const SavedAccount = (
	sequelize: Sequelize,
	dataTypes: typeof DataTypes
): SavedAccountStatic => {
	const savedAccount = sequelize.define<SavedAccount>(
		'SavedAccount',
		{
			id: {
				allowNull: false,
				primaryKey: true,
				unique: true,
				type: dataTypes.STRING
			},
			createdAt: {
				type: dataTypes.DATE
			},
			updatedAt: {
				type: dataTypes.DATE
			}
		},
		{ tableName: 'saved_accounts', underscored: true }
	) as SavedAccountStatic;

	savedAccount.associate = (model: MainModel) => {
		if (model.user) {
			savedAccount.belongsToMany(model.user, {
				through: 'user_saved_accounts',
				timestamps: false
			});
		}
	};

	return savedAccount;
};

export default SavedAccount;
