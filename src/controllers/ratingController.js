import Book from '../models/Book.js'
import Rating from '../models/Rating.js'
import User from '../models/User.js'
import { audit } from '../services/audit.js'

export const createRating = async (req, res) => {
    try {
        const { leafs, comment } = req.body
        const { bookId } = req.params

        if (leafs === undefined || typeof leafs !== 'number' || leafs < 1 || leafs > 5) {
            return res.status(400).json({ error: 'A nota (leafs) é obrigatória e deve ser um número entre 1 e 5.' })
        }

        if (comment && (typeof comment !== 'string' || comment.length > 500)) {
            return res.status(400).json({ error: 'O comentário deve ter no máximo 500 caracteres.' })
        }

        const book = await Book.findByPk(bookId)
        if (!book) {
            return res.status(404).json({ error: 'O livro pesquisado não foi encontrado.' })
        }

        const existingRating = await Rating.findOne({
            where: { userId: req.user.id, bookId }
        })

        if (existingRating) {
            return res.status(409).json({ error: 'Você já avaliou esse livro.' })
        }

        const rating = await Rating.create({
            leafs, comment, userId: req.user.id, bookId
        })

        return res.status(201).json(rating)
    } catch (err) {
        req.log.error({ err }, 'Erro ao criar avaliação')
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
}

export const updateRating = async (req, res) => {
    try {
        const { leafs, comment } = req.body
        const { bookId } = req.params

        if (leafs === undefined || typeof leafs !== 'number' || leafs < 1 || leafs > 5) {
            return res.status(400).json({ error: 'A nota (leafs) é obrigatória e deve ser um número entre 1 e 5.' })
        }

        if (comment && (typeof comment !== 'string' || comment.length > 500)) {
            return res.status(400).json({ error: 'O comentário deve ter no máximo 500 caracteres.' })
        }

        const rating = await Rating.findOne({
            where: { userId: req.user.id, bookId }
        })

        if (!rating) {
            return res.status(404).json({ error: 'Avaliação não encontrada.' })
        }

        await rating.update({ leafs, comment })

        return res.json(rating)
    } catch (err) {
        req.log.error({ err }, 'Erro ao atualizar avaliação')
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
}

export const deleteRating = async (req, res) => {
    try {
        const { bookId } = req.params

        const whereClause = { bookId }
        if (req.user.role !== 'admin') {
            whereClause.userId = req.user.id
        }

        const rating = await Rating.findOne({ where: whereClause })
        if (!rating) {
            return res.status(404).json({ error: 'Avaliação não encontrada.' })
        }

        const byAdmin = rating.userId !== req.user.id
        const info = { ratingId: rating.id, ownerId: rating.userId, bookId }

        await rating.destroy()

        if (byAdmin) {
            audit(req, 'rating.deleted_by_admin', info)
        }

        return res.json({ message: 'Avaliação removida com sucesso.' })
    } catch (err) {
        req.log.error({ err }, 'Erro ao remover avaliação')
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
}

export const getBookRatings = async (req, res) => {
    try {
        const { bookId } = req.params
        
        const page = parseInt(req.query.page) || 1
        const limit = 10
        const offset = (page - 1) * limit

        const { count, rows: ratings } = await Rating.findAndCountAll({
            where: { bookId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'avatarUrl']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        })

        const average = count ? (ratings.reduce((sum, r) => sum + r.leafs, 0) / ratings.length).toFixed(1) : null
        const totalPages = Math.ceil(count / limit)

        return res.json({
            average,
            totalRatings: count,
            currentPage: page,
            totalPages,
            ratings
        })
    } catch (err) {
        req.log.error({ err }, 'Erro ao buscar avaliações')
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
}

export const getUserRatings = async (req, res) => {
    try {
        const { userId } = req.params

        const ratings = await Rating.findAll({
            where: { userId },
            include: [{
                model: Book,
                as: 'book',
                attributes: ['id', 'title', 'coverUrl', 'publishedYear']
            }],
            order: [['createdAt', 'DESC']]
        })

        return res.json(ratings)
    } catch (err) {
        console.error('Erro ao buscar avaliações do usuário:', err)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
}