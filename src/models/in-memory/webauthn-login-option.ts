import {
  PublicKeyCredentialRequestOptionsJSON,
  VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import { DataTypes, Model, Sequelize } from 'sequelize';
import { InMemoryModel } from './in-mem-model';

interface WebAuthnLoginOptionModel {
  id?: number;
  passkeyId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
  verifiedAuthInfo?: VerifiedAuthenticationResponse;
  createdAt?: string;
  updatedAt?: string;
}

interface WebAuthnLoginOption
  extends Model<WebAuthnLoginOptionModel>,
    WebAuthnLoginOptionModel {}

export type WebAuthnLoginOptionStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): WebAuthnLoginOption;
  associate: (model: InMemoryModel) => void;
};

function WebAuthnLoginOption(
  sequelize: Sequelize,
  dataTypes: typeof DataTypes
) {
  const webAuthnLoginOption = sequelize.define<WebAuthnLoginOption>(
    'WebAuthnLoginOption',
    {
      id: {
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
        type: dataTypes.INTEGER
      },
      passkeyId: {
        allowNull: false,
        type: dataTypes.STRING
      },
      options: {
        allowNull: false,
        type: dataTypes.JSON
      },
      verifiedAuthInfo: {
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
      tableName: 'login_options',
      underscored: true
    }
  ) as WebAuthnLoginOptionStatic;

  return webAuthnLoginOption;
}

export default WebAuthnLoginOption;
