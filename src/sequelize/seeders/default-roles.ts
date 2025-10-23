'use strict';

import { QueryInterface, Sequelize } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface, _: Sequelize) {
    return queryInterface.bulkInsert('user_roles', [
      {
        id: 1,
        role: 'Admin'
      },
      {
        id: 2,
        role: 'Author'
      }
    ]);
  },

  async down(queryInterface: QueryInterface, _: Sequelize) {
    return queryInterface.bulkDelete('user_roles', {});
  }
};
