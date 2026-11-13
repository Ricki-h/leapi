import { Op } from "sequelize";
import Book from "../models/Book.js";
import Author from "../models/Author.js";
import Genre from "../models/Genre.js";
import axios from 'axios';
import { searchGoogleBooks, searchOpenLibrary, getOpenLibraryDetails, getOpenLibraryAuthorDetails } from '../services/bookService.js';

const saveBook = async (normalizedBook) => {
    // 1. Previne erro no Op.or se o livro não tiver nenhum dos 3 IDs
    const orConditions = [
        normalizedBook.googleBooksId ? { googleBooksId: normalizedBook.googleBooksId } : null,
        normalizedBook.openLibraryId ? { openLibraryId: normalizedBook.openLibraryId } : null,
        normalizedBook.isbn ? { isbn: normalizedBook.isbn } : null
    ].filter(Boolean);

    if (orConditions.length > 0) {
        const existing = await Book.findOne({ where: { [Op.or]: orConditions } });
        if (existing) return existing;
    }

    // 2. Previne erro se o autor vier nulo ou indefinido da API
    const authorName = normalizedBook.authorName ? String(normalizedBook.authorName).trim() : 'Autor Desconhecido';
    
    const [author] = await Author.findOrCreate({
        where: { name: authorName },
        defaults: { name: authorName }
    });

    // 3. Garante que o livro tenha pelo menos um título (algumas APIs retornam undefined e o banco recusa)
    const book = await Book.create({
        title: normalizedBook.title || 'Título Desconhecido',
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
    });

    // 4. Previne erro se "genres" não for um array
    if (Array.isArray(normalizedBook.genres)) {
        for (const genreName of normalizedBook.genres) {
            if (!genreName) continue;
            const [genre] = await Genre.findOrCreate({
                where: { name: genreName }
            });
            await book.addGenre(genre);
        }
    }

    return book;
};

export const searchBooks = async (req, res) => {
    try {
        const { q, author, genre, language, minPages, maxPages, year, minYear, maxYear, sortBy, sortOrder, page, limit } = req.query;

        if (!q && !author && !genre && !language && !minPages && !maxPages && !year && !minYear && !maxYear) {
            return res.status(400).json({ error: 'Informe ao menos um termo de busca.' });
        }

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 20, 50);
        const offset = (pageNum - 1) * limitNum;

        const validSortFields = ['title', 'publishedYear', 'pageCount', 'createdAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'title';
        const sortDir = sortOrder && ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'asc';

        const bookWhere = {};
        if (q) {
            bookWhere[Op.or] = [
                { title: { [Op.iLike]: `%${q}%` } },
                { '$author.name$': { [Op.iLike]: `%${q}%` } }
            ];
        }
        if (author) {
            bookWhere['$author.name$'] = { [Op.iLike]: `%${author}%` };
        }
        if (minPages || maxPages) {
            bookWhere.pageCount = {};
            if (minPages) bookWhere.pageCount[Op.gte] = parseInt(minPages);
            if (maxPages) bookWhere.pageCount[Op.lte] = parseInt(maxPages);
        }
        if (year) {
            bookWhere.publishedYear = parseInt(year);
        }
        if (minYear || maxYear) {
            bookWhere.publishedYear = {};
            if (minYear) bookWhere.publishedYear[Op.gte] = parseInt(minYear);
            if (maxYear) bookWhere.publishedYear[Op.lte] = parseInt(maxYear);
        }
        if (language) {
            bookWhere.language = { [Op.contains]: [language] };
        }

        const authorWhere = {};
        if (author) {
            authorWhere.name = { [Op.iLike]: `%${author}%` };
        }

        const genreWhere = {};
        if (genre) {
            genreWhere.name = { [Op.iLike]: `%${genre}%` };
        }

        // Busca local inicial
        const { rows: localBooks, count: localCount } = await Book.findAndCountAll({
            where: bookWhere,
            include: [
                {
                    model: Author,
                    as: 'author',
                    attributes: ['id', 'name'],
                    where: Object.keys(authorWhere).length ? authorWhere : undefined,
                    required: Object.keys(authorWhere).length > 0 || !!q
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
            order: [[sortField, sortDir]],
            limit: limitNum,
            offset: offset
        });

        // Se encontrou no banco local, retorna imediatamente
        if (localCount >= limitNum) {
            return res.json({
                books: localBooks,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: localCount,
                    pages: Math.ceil(localCount / limitNum)
                },
                source: 'local'
            });
        }

        const searchTerms = [];
        if (q) searchTerms.push(q);
        if (author) searchTerms.push(author);
        if (genre) searchTerms.push(genre);

        const searchQuery = searchTerms.filter(Boolean).join(' ').trim() || q || '';

        // Busca externa se a local não foi suficiente
        let externalResults = [];
        if (searchQuery) {
            try {
                req.log.debug({ searchQuery }, 'Pesquisando nas APIs externas');

                const [googleResults, openLibraryResults] = await Promise.all([
                    searchGoogleBooks(searchQuery),
                    searchOpenLibrary(searchQuery)
                ]);

                externalResults = [...(googleResults || []), ...(openLibraryResults || [])];
                req.log.info(
                    { event: 'books.external_search', searchQuery, found: externalResults.length },
                    'Busca em APIs externas concluída'
                );

                if (externalResults.length > 0) {
                    
                    await Promise.all(
                        externalResults.map(book => saveBook(book))
                    );
                    req.log.info({ event: 'books.external_saved', count: externalResults.length }, 'Livros externos salvos no banco local');
                }
            } catch (apiError) {
                req.log.error({ err: apiError, searchQuery }, 'Erro no bloco externo (salvamento ou API)');
            }
        }

        // Refaz a busca local agora incluindo os dados que acabaram de ser salvos
        const { rows: books, count: totalCount } = await Book.findAndCountAll({
            where: bookWhere,
            include: [
                {
                    model: Author,
                    as: 'author',
                    attributes: ['id', 'name'],
                    where: Object.keys(authorWhere).length ? authorWhere : undefined,
                    required: Object.keys(authorWhere).length > 0 || !!q
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
            order: [[sortField, sortDir]],
            limit: limitNum,
            offset: offset
        });

        return res.json({
            books: books,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                pages: Math.ceil(totalCount / limitNum)
            },
            source: totalCount > localCount ? 'mixed' : 'local'
        });

    } catch (err) {
        req.log.error({ err }, 'Erro em searchBooks');
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

export const getBook = async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id, {
            include: [
                { model: Author, as: 'author', attributes: ['id', 'name', 'bio', 'photoUrl'] },
                { model: Genre, as: 'genres', attributes: ['id', 'name'], through: { attributes: [] } }
            ]
        });

        if (!book) {
            return res.status(404).json({ error: 'Livro não encontrado.' });
        }

        if (!book.description && book.openLibraryId) {
            const details = await getOpenLibraryDetails(book.openLibraryId);

            const updates = {};
            if (details.description && !book.description) updates.description = details.description;
            if (details.isbn && !book.isbn) updates.isbn = details.isbn;
            if (details.pageCount && !book.pageCount) updates.pageCount = details.pageCount;
            if (details.publisher && !book.publisher) updates.publisher = details.publisher;
            if (details.genres?.length > 0) {
                for (const genreName of details.genres) {
                    const [genre] = await Genre.findOrCreate({ where: { name: genreName } });
                    await book.addGenre(genre);
                }
            }

            if (Object.keys(updates).length > 0) {
                await book.update(updates);
                Object.assign(book, updates);
            }
        }

        if (book.author && !book.author.bio && book.openLibraryId) {
            try {
                const searchRes = await axios.get('https://openlibrary.org/search.json', {
                    params: { q: book.title, limit: 1 }
                });
                const authorKey = searchRes.data.docs?.[0]?.author_key?.[0];
                if (authorKey) {
                    const authorDetails = await getOpenLibraryAuthorDetails(`/authors/${authorKey}`); 
                    if (authorDetails.bio || authorDetails.photoUrl) {
                        await book.author.update(authorDetails);
                        book.author.bio = authorDetails.bio;
                        book.author.photoUrl = authorDetails.photoUrl;
                    }
                }
            } catch (err) {
                req.log.warn({ err, bookId: book.id }, 'Erro buscando autor na Open Library');
            }
        }

        const updatedBook = await Book.findByPk(req.params.id, {
            include: [
                { model: Author, as: 'author', attributes: ['id', 'name', 'bio', 'photoUrl'] },
                { model: Genre, as: 'genres', attributes: ['id', 'name'], through: { attributes: [] } }
            ]
        });

        return res.json(updatedBook);
    } catch (err) {
        req.log.error({ err }, 'Erro em getBook');
        return res.status(500).json({ error: 'Erro ao buscar livro.' });
    }
};