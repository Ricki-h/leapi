import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Book from "./Book.js";
import BookList from "./BookList.js";

const BookListItem = sequelize.define('BookListItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    }
})

BookListItem.belongsTo(BookList, {
    foreignKey: 'listId',
    as: 'list'
})
BookList.hasMany(BookListItem, {
    foreignKey: 'listId',
    as: 'items'
})

BookListItem.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book'
})
Book.hasMany(BookListItem, {
    foreignKey: 'bookId',
    as: 'listItems'
})

export default BookListItem