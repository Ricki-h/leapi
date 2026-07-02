import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Book from "./Book.js";

const Rating = sequelize.define('Rating', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    leafs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    comment: {
        type: DataTypes.STRING(300),
        allowNull: true
    }
})

Rating.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
})
User.hasMany(Rating, {
    foreignKey: 'userId',
    as: 'ratings'
})

Rating.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book'
})
Book.hasMany(Rating, {
    foreignKey: 'bookId',
    as: 'ratings'
})

export default Rating