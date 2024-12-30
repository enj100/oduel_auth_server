const { DataTypes } = require("sequelize");
const sequelize = require("../database/database");

const Settings = sequelize.define("settings", {
    id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        primaryKey: true,
        defaultValue: 0
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "ffffff"
    },
    thumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    server_name: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    auth_link: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    auth_role: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    auth_desc: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
});

module.exports = Settings;
