import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js' // Seu arquivo de configuração do Sequelize

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // Outros campos como userId, postId seriam definidos aqui
});

// Associações para hierarquia
Comment.hasMany(Comment, {
  as: 'Replies',
  foreignKey: 'parentId',
  onDelete: 'CASCADE', // Opcional: deletar respostas ao deletar o pai
});

Comment.belongsTo(Comment, {
  as: 'Parent',
  foreignKey: 'parentId',
});

// Associações com User e Post (exemplo)
// Comment.belongsTo(User, { foreignKey: 'userId' });
// Comment.belongsTo(Post, { foreignKey: 'postId' });


export default Comment;