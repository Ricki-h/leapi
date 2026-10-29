import Book from '../models/Book.js'
import Rating from '../models/Rating.js'
import User from '../models/User.js'
import { to } from '../utils/to.js'

export const createRating = async (req, res) => {
    const { leafs, comment } = req.body
    const { bookId } = req.params

    if (leafs === undefined || typeof leafs !== 'number' || leafs < 1 || leafs > 5) {
        return res.status(400).json({ error: 'A nota (leafs) é obrigatória e deve ser um número entre 1 e 5.' })
    }

    if (comment && (typeof comment !== 'string' || comment.length > 500)) {
        return res.status(400).json({ error: 'O comentário deve ter no máximo 500 caracteres.' })
    }

    const [bookErr, book] = await to(Book.findByPk(bookId))
    if (bookErr) {
        console.error('Erro ao buscar livro:', bookErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
    if (!book) {
        return res.status(404).json({ error: 'O livro pesquisado não foi encontrado.' })
    }

    const [existErr, existingRating] = await to(
        Rating.findOne({ where: { userId: req.user.id, bookId } })
    )
    if (existErr) {
        console.error('Erro ao verificar avaliação existente:', existErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
    if (existingRating) {
        return res.status(409).json({ error: 'Você já avaliou esse livro.' })
    }

    const [createErr, rating] = await to(
        Rating.create({ leafs, comment, userId: req.user.id, bookId })
    )
    if (createErr) {
        console.error('Erro ao criar avaliação:', createErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }

    return res.status(201).json(rating)
}

export const updateRating = async (req, res) => {
    const { leafs, comment } = req.body
    const { bookId } = req.params

    // 1. Validações de entrada
    if (leafs === undefined || typeof leafs !== 'number' || leafs < 1 || leafs > 5) {
        return res.status(400).json({ error: 'A nota (leafs) é obrigatória e deve ser um número entre 1 e 5.' })
    }

    if (comment && (typeof comment !== 'string' || comment.length > 500)) {
        return res.status(400).json({ error: 'O comentário deve ter no máximo 500 caracteres.' })
    }

    const [findErr, rating] = await to(
        Rating.findOne({ where: { userId: req.user.id, bookId } })
    )
    if (findErr) {
        console.error('Erro ao buscar avaliação:', findErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
    if (!rating) {
        return res.status(404).json({ error: 'Avaliação não encontrada.' })
    }

    const [updateErr] = await to(rating.update({ leafs, comment }))
    if (updateErr) {
        console.error('Erro ao atualizar avaliação:', updateErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }

    return res.json(rating)
}

export const deleteRating = async (req, res) => {
    const { bookId } = req.params

    const whereClause = { bookId }
    if (req.user.role !== 'admin') {
        whereClause.userId = req.user.id
    }

    const [findErr, rating] = await to(Rating.findOne({ where: whereClause }))
    if (findErr) {
        console.error('Erro ao buscar avaliação para remoção:', findErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
    if (!rating) {
        return res.status(404).json({ error: 'Avaliação não encontrada.' })
    }

    const [destroyErr] = await to(rating.destroy())
    if (destroyErr) {
        console.error('Erro ao remover avaliação:', destroyErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }

    return res.json({ message: 'Avaliação removida com sucesso.' })
}

export const getBookRatings = async (req, res) => {
    const { bookId } = req.params

    const page = parseInt(req.query.page) || 1
    const limit = 10
    const offset = (page - 1) * limit

    const [findErr, result] = await to(
        Rating.findAndCountAll({
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
    )

    if (findErr) {
        console.error('Erro ao buscar avaliações do livro:', findErr)
        return res.status(500).json({ error: 'Erro interno no servidor.' })
    }

    const { count, rows: ratings } = result
    const average = count ? (ratings.reduce((sum, r) => sum + r.leafs, 0) / ratings.length).toFixed(1) : null
    const totalPages = Math.ceil(count / limit)

    return res.json({
        average,
        totalRatings: count,
        currentPage: page,
        totalPages,
        ratings
    })
}