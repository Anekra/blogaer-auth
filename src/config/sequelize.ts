const sequelizeConfig = {
  development: {
    username: `${process.env.DB_USER}`,
    password: `${process.env.DB_PASS}`,
    database: `${process.env.DB_NAME}`,
    host: `${process.env.DB_HOST}`,
    storage: `${process.env.DB_FILE}`,
    dialect: 'sqlite'
  },
  test: {
    username: 'root',
    password: null,
    database: 'database_test',
    host: '127.0.0.1',
    dialect: 'sqlite'
  },
  production: {
    username: 'root',
    password: null,
    database: 'database_production',
    host: '127.0.0.1',
    dialect: 'sqlite'
  }
};

export default sequelizeConfig;