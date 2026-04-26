import { DataTypes, UUID } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";

const Follow = sequelize.define('Follow', {
    followerId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    followingId: {
        type: DataTypes.UUID,
        allowNull: false
    }
})

User.belongsToMany(User, {
    through: Follow,
    as: 'following',
    foreignKey: 'followerId'
})

User.belongsToMany(User, {
    through: Follow,
    as: 'followers',
    foreignKey: 'FollowingId'
})

export default Follow