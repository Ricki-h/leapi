const express = require("express");
const router = express.Router();
const Post = require("../models/Post"); // Seu modelo Post
const Comment = require("../models/Comment"); // Seu modelo Comment

// POST /api/posts - Criar um novo post
router.post("/", async (req, res) => {
  try {
    const { title, content, userId } = req.body;
    const newPost = await Post.create({ title, content, userId });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/posts - Listar todos os posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.findAll({
      include: [
        {
          model: Comment,
          as: "Comments", // Opcional: para incluir comentários diretamente na listagem
          // include: [{ model: Comment, as: 'Replies' }] // Se quiser incluir respostas aninhadas aqui
        },
        // Se você tiver um modelo User:
        // { model: User, as: 'Author', attributes: ['id', 'name'] }
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/posts/:id - Obter um post específico por ID (com seus comentários)
router.get("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: Comment,
          as: "Comments",
          where: { parentId: null }, 
          required: false, 
          include: [
            {
              model: Comment,
              as: "Replies",
              
            },
          ],
        },
        
      ],
    });

    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }

    // Função auxiliar para construir a árvore de comentários (reutilizada do guia anterior)
    const buildCommentTree = (commentsArray) => {
      if (!commentsArray) return [];
      return commentsArray.map((comment) => {
        const commentData = comment.toJSON();
        if (commentData.Replies && commentData.Replies.length > 0) {
          commentData.Replies = buildCommentTree(commentData.Replies);
        }
        return commentData;
      });
    };

    const postWithCommentTree = post.toJSON();
    postWithCommentTree.Comments = buildCommentTree(postWithCommentTree.Comments);

    res.json(postWithCommentTree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;