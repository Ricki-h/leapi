import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { len: [1, 500] }
    }
})

Post.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
})
User.hasMany(Post, {
    foreignKey: 'userId',
    as: 'posts'
})

// auto-relacionamento pra replies
Post.belongsTo(Post, {
    foreignKey: 'parentId',
    as: 'parent'
})
Post.hasMany(Post, {
    foreignKey: 'parentId',
    as: 'replies'
})

export default Post