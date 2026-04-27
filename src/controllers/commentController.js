const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment'); // Seu modelo Comment

// POST /api/comments - Criar um novo comentário
router.post('/', async (req, res) => {
  try {
    const { content, userId, postId, parentId } = req.body;
    const newComment = await Comment.create({ content, userId, postId, parentId });
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/comments/:postId - Obter comentários de um post específico
// Esta rota busca os comentários de nível superior e suas respostas aninhadas.
router.get('/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const comments = await Comment.findAll({
      where: { postId, parentId: null }, // Busca apenas comentários de nível superior
      include: [{
        model: Comment,
        as: 'Replies',
        // Para buscar respostas aninhadas, você pode adicionar includes recursivos aqui
        // No entanto, para profundidade arbitrária, é melhor processar no backend ou frontend
        include: [{
          model: Comment,
          as: 'Replies',
          // ... e assim por diante, ou usar uma função recursiva para construir a árvore
        }]
      }],
      order: [['createdAt', 'ASC']],
    });

    // Função auxiliar para construir a árvore de comentários (exemplo simplificado)
    const buildCommentTree = (commentsArray) => {
      return commentsArray.map(comment => {
        const commentData = comment.toJSON();
        if (commentData.Replies && commentData.Replies.length > 0) {
          commentData.Replies = buildCommentTree(commentData.Replies);
        }
        return commentData;
      });
    };

    res.json(buildCommentTree(comments));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;