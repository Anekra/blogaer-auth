'use strict';

import bcryptjs from 'bcryptjs';
import { QueryInterface, Sequelize } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface, _: Sequelize) {
    return queryInterface.bulkInsert('users', [
      {
        id: '0000000a-477c-4502-b34e-11111111111z',
        username: 'SuperAdmin',
        email: 'andikaout@outlook.com',
        password: bcryptjs.hashSync(`${process.env.SUPER_ADMIN}`, 8),
        name: 'Super Admin',
        description: 'The administrator',
        roleId: 1
      }
    ]);
  },

  async down(queryInterface: QueryInterface, _: Sequelize) {
    return queryInterface.bulkDelete('users', {});
  }
};
