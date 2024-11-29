const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Auth = sequelize.define("discord_auth", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    primaryKey: true,
    autoIncrement: true
  },
  discord_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  access_token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Auth;
