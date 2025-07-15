const sequelizeConfig = {
  development: {
    username: `${process.env.DEV_DB_USER}`,
    password: `${process.env.DEV_DB_PASSWORD}`,
    database: `${process.env.DEV_DB_NAME}`,
    host: `${process.env.DEV_HOST}`,
    storage: 'blogaer_auth.db',
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