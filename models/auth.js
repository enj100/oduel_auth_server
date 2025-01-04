const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Auth = sequelize.define("auth", {
  discord_id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  access_token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Auth;
