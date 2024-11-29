const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_LOGIN,
    process.env.DB_PW,
    {
        host: process.env.DB_HOST,
        dialect: "mysql",
        logging: false,
    }
);

module.exports = sequelize;
