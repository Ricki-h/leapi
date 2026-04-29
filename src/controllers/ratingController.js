import Book from '../models/Book.js'
import Rating from '../models/Rating.js'
import User from '../models/User.js'

export const createOrUpdateRating = async (req, res) => {
    try {
        const { leafs, comment } = req.body
        const { bookId } = req.params

        const book = await Book.findByPk(bookId)
        if (!book) {
            return res.status(404).json({ error: 'Livro não encontrado.' })
        }

        const [rating, created] = await Rating.findOrCreate({
            where: { userId: req.user.id, bookId },
            defaults: { leafs, comment, userId: req.user.id, bookId }
        })

        if (!created) {
            await rating.update({ leafs, comment })
        }

        return res.status(created ? 201 : 200).json(rating)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const deleteRating = async (req, res) => {
    try {
        const rating = await Rating.findOne({
            where: { userId: req.user.id, bookId: req.params.bookId }
        })

        if (!rating) {
            return res.status(404).json({ error: 'Avaliação não encontrada.' })
        }

        await rating.destroy()

        return res.json({ message: 'Avaliação removida.' })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getBookRatings = async (req, res) => {
    try {
        const ratings = await Rating.findAll({
            where: { bookId: req.params.bookId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'avatarUrl']
            }],
            order: [['createdAt', 'DESC']]
        })

        const average = ratings.length ? (ratings.reduce((sum, r) => sum + r.leafs, 0) / ratings.length).toFixed(1) : null

        return res.json({ average, total: ratings.length, ratings })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}