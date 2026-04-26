import { Op } from "sequelize";
import Book from "../models/Book.js";
import Author from "../models/Author.js";
import Genre from "../models/Genre.js";
import { searchGoogleBooks, searchOpenLibrary } from "../services/bookService.js";

const saveBook = async (normalizedBook) => {
    const existing = await Book.findOne({
        where: {
            [Op.or]: [
                normalizedBook.googleBooksId ? { googleBooksId: normalizedBook.googleBooksId } : null,
                normalizedBook.openLibraryId ? { openLibraryId: normalizedBook.openLibraryId } : null,
                normalizedBook.isbn ? { isbn: normalizedBook.isbn } : null
            ].filter(Boolean)
        }
    })

    if (existing) return existing

    const [author] = await Author.findOrCreate({
        where: { name: normalizedBook.authorName }
    })

    const book = await Book.create({
        title: normalizedBook.title,
        description: normalizedBook.description,
        coverUrl: normalizedBook.coverUrl,
        isbn: normalizedBook.isbn,
        publishedYear: normalizedBook.publishedYear,
        publisher: normalizedBook.publisher,
        language: normalizedBook.language,
        pageCount: normalizedBook.pageCount,
        googleBooksId: normalizedBook.googleBooksId,
        openLibraryId: normalizedBook.openLibraryId,
        authorId: author.id
    })

    for (const genreName of  normalizedBook.genres) {
        if (!genreName) continue
        const [genre] = await Genre.findOrCreate({
            where: { name: genreName }
        })
        await book.addGenre(genre)
    }

    return book
}

export const searchBooks = async (req, res) => {
    try {
        const { q } = req.query

        if (!q) {
            return res.status(400).json({ error: 'Informe um temro de busca.' })
        }

        const localBooks = await Book.findAll({
            where: { title: { [Op.iLike]: `%${q}%` } },
            include: [
                {
                    model: Author,
                    as: 'author',
                    attributes: ['id', 'name']
                },
                {
                    model: Genre,
                    as: 'genres',
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                }
            ],
            limit: 10
        })

        if (localBooks >= 5) {
            return res.json(localBooks)
        }

        const [googleResults, openLibraryResults] = await Promise.all([
            searchGoogleBooks(q),
            searchOpenLibrary(q)
        ])

        const allResults = [...googleResults, ...openLibraryResults]

        const savedBooks = await Promise.all(
            allResults.map(book => saveBook(book))
        ) 

        const books = await Book.findAll({
            where: { title: { [Op.iLike]: `%${q}%` } },
            include: [
                {
                    model: Author,
                    as: 'author',
                    attributes: ['id', 'name']
                },
                {
                    model: Genre,
                    as: 'genres',
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                }
            ],
            limit: 10
        })

        return res.json(books)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const getBook = async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id, {
            include: [
                {
                    model: Author,
                    as: 'author',
                    attributes: ['id', 'name']
                },
                {
                    model: Genre,
                    as: 'genres',
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                }
            ]
        })

        if (!book) {
            return res.status(404).json({ error: 'Livro não encontrado.' })
        }

        res.json(book)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}