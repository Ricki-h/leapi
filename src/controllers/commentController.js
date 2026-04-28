import Comment from '../models/Comment'
import User from '../models/User.js'

export const createComment = async (req, res) => {
    try {
        const { content, postId, parentId } = req.body
        const userId = req.user.id // Pegando do middleware de autenticação

        const comment = await Comment.create({
            content,
            postId,
            userId,
            parentId: parentId || null
        })

        return res.status(201).json(comment)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getCommentsByPostId = async (req, res) => {
    try {
        const comments = await Comment.findAll({
            where: { 
                postId: req.params.postId,
                parentId: null // Apenas comentários principais
            },
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'name', 'username', 'avatarUrl']
                },
                {
                    model: Comment,
                    as: 'replies',
                    include: [
                        {
                            model: User,
                            as: 'author',
                            attributes: ['id', 'name', 'username', 'avatarUrl']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        })

        return res.json(comments)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findByPk(req.params.id)

        if (!comment) {
            return res.status(404).json({ error: 'Comentário não encontrado.' })
        }

        // Verifica se o usuário é o autor ou admin
        if (comment.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' })
        }

        await comment.destroy()

        return res.json({ message: 'Comentário deletado com sucesso.' })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}
