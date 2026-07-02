import Resenha from '../models/Resenha.js'
import Book from '../models/Book.js'
import User from '../models/User.js'

export const createResenha = async (req, res) => {
    try {
        const { bookId } = req.params
        const { score, body, writing, plot, characters, pacing, emotionalImpact, worldbuilding } = req.body

        const book = await Book.findByPk(bookId)
        if (!book) {
            return res.status(404).json({ error: 'Livro não encontrado.' })
        }

        const existing = await Resenha.findOne({
            where: { userId: req.user.id, bookId }
        })
        if (existing) {
            return res.status(400).json({ error: 'Você já escreveu uma resenha deste livro.' })
        }

        const resenha = await Resenha.create({
            score, body, writing, plot, characters,
            pacing, emotionalImpact, worldbuilding,
            userId: req.user.id,
            bookId
        })

        return res.status(201).json(resenha)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const updateResenha = async (req, res) => {
    try {
        const resenha = await Resenha.findOne({
            where: { id: req.params.id, userId: req.user.id }
        })
        if(!resenha) {
            return res.status(404).json({ error: 'Resenha não encontrada.' })
        }

        const {  }
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const deleteResenha = async (req, res) => {
    try {
        const resenha = await Resenha.findOne({
            where: { id: req.params.id }
        })

        if (!resenha) {
            res.status(404).json({ error: 'Resenha não encontrada.' })
        }

        if (resenha.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        await resenha.destroy()

        return res.json({ message: 'Resenha deletada.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const getBookResenhas = async (req, res) => {
    try {
        const resenhas = await Resenha.findAll({
            where: { bookId: req.params.bookId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'avatarUrl']
            }],
            order: [['createdAt', 'DESC']]
        })

        const average = resenhas.length ? (resenhas.reduce((sum, r) => sum + parseFloat(r.score), 0) / resenhas.length).toFixed(1) : null

        return res.json({ average, total: resenhas.length, resenhas })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getUserResenhas = async (req, res) => {
    try {
        const resenhas = await Resenha.findAll({
            where: { userId: req.params.userId },
            include: [{
                model: Book,
                as: 'book',
                attributes: ['id', 'title', 'coverUrl']
            }],
            order: [['createdAt', 'DESC']]
        })

        return res.json(resenhas)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}