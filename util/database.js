const Sequelize = require('sequelize');

const sequelize = new Sequelize(
  'post-feed', // database name
  'root',          // mysql username
  '0105Aish@123', // mysql password
  {
    dialect: 'mysql',
    host: 'localhost'
  }
);

module.exports = sequelize;