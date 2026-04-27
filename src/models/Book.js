import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Author from "./Author.js";
import Genre from "./Genre.js";

const Book = sequelize.define('Book', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    coverUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isbn: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    publishedYear: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    publisher: {
        type: DataTypes.STRING,
        allowNull: true
    },
    language: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true
    },
    pageCount: {
        type: DataTypes.STRING,
        allowNull: true
    },
    googleBooksId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    openLibraryId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    }
})

Book.belongsTo(Author, { 
    foreignKey: 'authorId', 
    as: 'author'
})
Author.hasMany(Book, {
    foreignKey: 'authorId',
    as: 'books'
})

Book.belongsToMany(Genre, {
    through: 'BookGenres',
    as: 'genres',
    foreignKey: 'bookId'
})
Genre.belongsToMany(Book, {
    through: 'BookGenres',
    as: 'books',
    foreignKey: 'genreId'
})

export default Book