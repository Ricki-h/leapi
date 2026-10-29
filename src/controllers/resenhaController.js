import Resenha from '../models/Resenha.js'
import Book from '../models/Book.js'
import User from '../models/User.js'

export const createResenha = async (req, res) => {
    try {
        const { bookId } = req.params
        const { body, writing, plot, characters, pacing, emotionalImpact, worldbuilding } = req.body

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
            body, writing, plot, characters,
            pacing, emotionalImpact, worldbuilding,
            userId: req.user.id,
            bookId
        })

        return res.status(201).json(resenha)
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao criar uma resenha.' })
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

            const FIELDS = ['body', 'writing', 'plot', 'characters', 'pacing', 'emotionalImpact', 'worldbuilding']
            const pick = (obj, keys) =>
                Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]))

            resenha.set(pick(req.body, FIELDS))
            await resenha.save()

            return res.json(resenha)
            } catch (err) {
                return res.status(500).json({ error: 'Erro ao atualizar resenha' })
            }
        }

export const deleteResenha = async (req, res) => {
    try {
        const resenha = await Resenha.findOne({
            where: { id: req.params.id }
        })

        if (!resenha) {
            return res.status(404).json({ error: 'Resenha não encontrada.' })
        }

        if (resenha.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        await resenha.destroy()

        return res.json({ message: 'Resenha deletada.' })
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar resenha.' })
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
        return res.status(500).json({ error: 'Erro ao carreegar resenhas do livro' })
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
        res.status(500).json({ error: 'Erro ao carregar resenhas do usuário' })
    }
}