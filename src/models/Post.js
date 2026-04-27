const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js"); // Seu arquivo de configuração do Sequelize
const Comment = require("./Comment.js"); // Importa o modelo Comment
// const User = require("./User"); // Se você tiver um modelo User

const Post = sequelize.define("Post", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // userId seria definido aqui se houver um modelo User
});

// Associações
Post.hasMany(Comment, {
  foreignKey: "postId",
  onDelete: "CASCADE", // Opcional: deletar comentários ao deletar o post
});
Comment.belongsTo(Post, {
  foreignKey: "postId",
});

// Se você tiver um modelo User:
// Post.belongsTo(User, { foreignKey: "userId" });
// User.hasMany(Post, { foreignKey: "userId" });

module.exports = Post;