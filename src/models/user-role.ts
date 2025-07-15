'use strict';
import { DataTypes, Model, Sequelize } from 'sequelize';
import type { MainModel } from './main-model';

interface UserRoleModel {
  id: number;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserRole extends Model<UserRoleModel>, UserRoleModel {}

type UserRoleStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): UserRole;
  associate: (model: MainModel) => void;
};

const UserRole = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const userRole = sequelize.define<UserRole>(
    'UserRole',
    {
      id: {
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
        type: dataTypes.TINYINT
      },
      role: {
        allowNull: false,
        type: dataTypes.STRING
      },
      createdAt: {
        type: dataTypes.DATE
      },
      updatedAt: {
        type: dataTypes.DATE
      }
    },
    { tableName: 'user_roles', underscored: true }
  ) as UserRoleStatic;

  userRole.associate = (model: MainModel) => {
    if (model.user) {
      userRole.hasMany(model.user, { foreignKey: 'role_id' });
    }
  };

  return userRole;
};

export default UserRole;
