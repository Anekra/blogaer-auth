import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server';
import type { DataTypes, Model, Sequelize } from 'sequelize';
import type { InMemoryModel } from './in-mem-model';

interface WebAuthnRegisterOptionModel {
	id?: number;
	userId: string;
	options: PublicKeyCredentialCreationOptionsJSON;
	createdAt?: string;
	updatedAt?: string;
}

interface WebAuthnRegisterOption
	extends Model<WebAuthnRegisterOptionModel>,
		WebAuthnRegisterOptionModel {}

export type WebAuthnRegisterOptionStatic = typeof Model & {
	new (values?: Record<string, unknown>, options?: unknown): WebAuthnRegisterOption;
	associate: (model: InMemoryModel) => void;
};

function WebAuthnRegisterOption(
	sequelize: Sequelize,
	dataTypes: typeof DataTypes
) {
	const webAuthnRegisterOption = sequelize.define<WebAuthnRegisterOption>(
		'WebAuthnRegisterOption',
		{
			id: {
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
				type: dataTypes.INTEGER
			},
			userId: {
				allowNull: false,
				type: dataTypes.UUID
			},
			options: {
				allowNull: false,
				type: dataTypes.JSON
			},
			createdAt: {
				type: dataTypes.DATE
			},
			updatedAt: {
				type: dataTypes.DATE
			}
		},
		{
			tableName: 'register_options',
			underscored: true
		}
	) as WebAuthnRegisterOptionStatic;

	return webAuthnRegisterOption;
}

export default WebAuthnRegisterOption;
