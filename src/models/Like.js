import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Post from "./Post.js";

const Like = sequelize.define('Like', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    }
}, {
    indexes: [
        { unique: true, fields: ['userId', 'postId'] }
    ]
})

Like.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
})
User.hasMany(Like, {
    foreignKey: 'userId',
    as: 'likes'
})

Like.belongsTo(Post, {
    foreignKey: 'postId',
    as: 'post'
})
Post.hasMany(Like, {
    foreignKey: 'postId',
    as: 'likes'
})

export default Like