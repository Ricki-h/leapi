import { Op } from "sequelize";
import Book from "../models/Book.js";
import Author from "../models/Author.js";
import Genre from "../models/Genre.js";
import axios from 'axios'
import { searchGoogleBooks, searchOpenLibrary, getOpenLibraryDetails, getOpenLibraryAuthorDetails } from '../services/bookService.js'

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
        where: { name: normalizedBook.authorName.trim() },
        defaults: { name: normalizedBook.authorName.trim() }
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
        const { q, author, genre, language, minPages, maxPages, year } = req.query

        if (!q && !author && !genre && !language && !minPages && !maxPages && !year) {
            return res.status(400).json({ error: 'Informe ao menos um termo de busca.' })
        }

        // Monta o where do livro
        const bookWhere = {}
        if (q) {
            bookWhere.title = { [Op.iLike]: `%${q}%` }
        }
        if (minPages || maxPages) {
            bookWhere.pageCount = {}
            if (minPages) bookWhere.pageCount[Op.gte] = parseInt(minPages)
            if (maxPages) bookWhere.pageCount[Op.lte] = parseInt(maxPages)
        }
        if (year) {
            bookWhere.publishedYear = parseInt(year)
        }
        if (language) {
            bookWhere.language = { [Op.contains]: [language] }
        }

        // Monta o where do autor
        const authorWhere = {}
        if (author) {
        authorWhere.name = { [Op.iLike]: `%${author}%` }
        }
        if (q && !author) {
        authorWhere[Op.or] = [
            { name: { [Op.iLike]: `%${q}%` } }
        ]
        }

        // Monta o where do gênero
        const genreWhere = {}
        if (genre) {
        genreWhere.name = { [Op.iLike]: `%${genre}%` }
        }

        const localBooks = await Book.findAll({
            where: bookWhere,
            include: [
                {
                    model: Author,
                    as: 'author',
                    attributes: ['id', 'name'],
                    where: Object.keys(authorWhere).length ? authorWhere : undefined,
                    required: Object.keys(authorWhere).length > 0
                },
                {
                    model: Genre,
                    as: 'genres',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                    where: Object.keys(genreWhere).length ? genreWhere : undefined,
                    required: Object.keys(genreWhere).length > 0
                }
            ],
            limit: 20
        })

        if (localBooks >= 5) {
            return res.json(localBooks)
        }

        if (q) {
            const searchTerm = author ? `${q} ${author}` : q

            const [googleResults, openLibraryResults] = await Promise.all([
                searchGoogleBooks(searchTerm),
                searchOpenLibrary(searchTerm)
            ])

            const allResults = [...googleResults, ...openLibraryResults]

            await Promise.all(allResults.map(book => saveBook(book)))

            const books = await Book.findAll({
                where: bookWhere,
                include: [
                {
                    model: Author,
                    as: 'author',
                    attributes: ['id', 'name'],
                    where: Object.keys(authorWhere).length ? authorWhere : undefined,
                    required: Object.keys(authorWhere).length > 0
                },
                {
                    model: Genre,
                    as: 'genres',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                    where: Object.keys(genreWhere).length ? genreWhere : undefined,
                    required: Object.keys(genreWhere).length > 0
                }
                ],
                limit: 20
            })
            return res.json(books)
        }

        return res.json(localBooks)

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const getBook = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [
        { model: Author, as: 'author', attributes: ['id', 'name', 'bio', 'photoUrl'] },
        { model: Genre, as: 'genres', attributes: ['id', 'name'], through: { attributes: [] } }
      ]
    })

    if (!book) {
      return res.status(404).json({ error: 'Livro não encontrado.' })
    }

    if (!book.description && book.openLibraryId) {
        const details = await getOpenLibraryDetails(book.openLibraryId)
  
        const updates = {}
        if (details.description && !book.description) updates.description = details.description
        if (details.isbn && !book.isbn) updates.isbn = details.isbn
        if (details.pageCount && !book.pageCount) updates.pageCount = details.pageCount
        if (details.publisher && !book.publisher) updates.publisher = details.publisher
        if (details.genres?.length > 0) {
            for (const genreName of details.genres) {
                const [genre] = await Genre.findOrCreate({ where: { name: genreName } })
                await book.addGenre(genre)
            }
        }

        if (Object.keys(updates).length > 0) {
            await book.update(updates)
            Object.assign(book, updates)
        }

    }

    if (book.author && !book.author.bio && book.openLibraryId) {
      try {
        const searchRes = await axios.get('https://openlibrary.org/search.json', {
          params: { q: book.title, limit: 1 }
        })
        const authorKey = searchRes.data.docs?.[0]?.author_key?.[0]
        if (authorKey) {
          const authorDetails = await getOpenLibraryAuthorDetails(`/authors/${authorKey}`)
          if (authorDetails.bio || authorDetails.photoUrl) {
            await book.author.update(authorDetails)
            book.author.bio = authorDetails.bio
            book.author.photoUrl = authorDetails.photoUrl
          }
        }
      } catch (err) {
        console.error('Erro buscando autor:', err.message)
      }
    }

    const updatedBook = await Book.findByPk(req.params.id, {
        include: [
            { model: Author, as: 'author', attributes: ['id', 'name', 'bio', 'photoUrl'] },
            { model: Genre, as: 'genres', attributes: ['id', 'name'], through: { attributes: [] } }
        ]
    })

    return res.json(updatedBook)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}