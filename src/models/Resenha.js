import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Book from "./Book.js";

const Resenha = sequelize.define('Resenha', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    score: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: false,
        validate: { min: 0, max: 10 }
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    writing: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    plot: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    characters: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    pacing: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    emotionalImpact: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    worldbuilding: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 }
    }
})

Resenha.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
})
User.hasMany(Resenha, {
    foreignKey: 'userId',
    as: 'resenhas'
})

Resenha.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book'
})
Book.hasMany(Resenha, {
    foreignKey: 'bookId',
    as: 'resenhas'
})

export default Resenha