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