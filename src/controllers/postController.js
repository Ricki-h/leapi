import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'

export const createPost = async (req, res) => {
    try {
        const { title, content } = req.body
        const userId = req.user.id // Pegando do middleware de autenticação

        const post = await Post.create({
            title,
            content,
            userId
        })

        return res.status(201).json(post)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'name', 'username', 'avatarUrl']
                }
            ],
            order: [['createdAt', 'DESC']]
        })

        return res.json(posts)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getPostById = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'name', 'username', 'avatarUrl']
                }
            ]
        })

        if (!post) {
            return res.status(404).json({ error: 'Post não encontrado.' })
        }

        return res.json(post)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id)

        if (!post) {
            return res.status(404).json({ error: 'Post não encontrado.' })
        }

        // Verifica se o usuário é o autor ou admin
        if (post.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' })
        }

        await post.destroy()

        return res.json({ message: 'Post deletado com sucesso.' })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}
