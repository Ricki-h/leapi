import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";

const BookList = sequelize.define('BookList', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPrivate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
})

BookList.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
})
User.hasMany(BookList, {
    foreignKey: 'userId',
    as: 'lists'
})

export default BookList