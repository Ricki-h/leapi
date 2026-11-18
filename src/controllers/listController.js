import Author from "../models/Author.js";
import Book from "../models/Book.js";
import BookList from "../models/BookList.js";
import BookListItem from "../models/BookListItem.js";
import User from "../models/User.js";

export const getLists = async (req, res) => {
    try {
        const lists = await BookList.findAll({
            where: { userId: req.params.userId, isPrivate: false },
            include: [{
                model: BookListItem,
                as: 'items',
                include: [{
                    model: Book,
                    as: 'book',
                    include: [{ model: Author, as: 'author', attributes: ['id', 'name'] }],
                    attributes: ['id', 'title', 'coverUrl', 'publishedYear']
                }]
                }]
        })

        return res.json(lists)
    } catch (err) {
        req.log.error({ err }, 'Erro em getLists')
        return res.status(500).json({ error: 'Erro ao buscar listas.' })
    }
}

export const getList = async (req, res) => {
    try {
        const list = await BookList.findByPk(req.params.id, {
            include: [{
                model: BookListItem,
                as: 'items',
                include: [{
                    model: Book,
                    as: 'book',
                    include: [{ model: Author, as: 'author', attributes: ['id', 'name'] }],
                    attributes: ['id', 'title', 'coverUrl', 'publishedYear']
                }]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'username']
                }]
        })

        if (!list) {
            return res.status(404).json({ error: 'Lista não encontrada.' })
        }

        // Lista privada só pode ser vista pela dona
        if (list.isPrivate && list.userId !== req.user?.id) {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        return res.json(list)
    } catch (err) {
        req.log.error({ err }, 'Erro em getList')
        return res.status(500).json({ error: 'Erro ao buscar lista.' })
    }
}

export const getMyLists = async (req, res) => {
    try {
        const lists = await BookList.findAll({
            where: { userId: req.user.id },
            include: [{
                model: BookListItem,
                as: 'items',
                include: [{
                    model: Book,
                    as: 'book',
                    include: [{ model: Author, as: 'author', attributes: ['id', 'name'] }],
                    attributes: ['id', 'title', 'coverUrl', 'publishedYear']
                }]
                }]
        })

        return res.json(lists)
    } catch (err) {
        req.log.error({ err }, 'Erro em getMyLists')
        return res.status(500).json({ error: 'Erro ao buscar suas listas.' })
    }
}

export const createList = async (req, res) => {
    try {
        const { name, isPrivate } = req.body

        const list = await BookList.create({
            name,
            isPrivate: isPrivate || false,
            isDefault: false,
            userId: req.user.id
        })

        return res.status(201).json(list)
    } catch (err) {
        req.log.error({ err }, 'Erro em createList')
        return res.status(500).json({ error: 'Erro ao criar lista.' })
    }
}

export const updateList = async (req, res) => {
    try {
        const list = await BookList.findByPk(req.params.id)

        if (!list) {
            return res.status(404).json({ error: 'Lista não encontrada.' })
        }

        if (list.userId !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        if (list.isDefault) {
            return res.status(400).json({ error: 'Listas Padrões não podem ser editadas.' })
        }

        await list.update({
            name: req.body.name,
            isPrivate: req.body.isPrivate
        })

        return res.json(list)
    } catch (err) {
        req.log.error({ err }, 'Erro em updateList')
        return res.status(500).json({ error: 'Erro ao editar lista.' })
    }
}

export const deleteList = async(req, res) => {
    try {
        const list = await BookList.findByPk(req.params.id)

        if (!list) {
            return res.status(404).json({ error: 'Lista não encontrada.' })
        }

        if (list.userId !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        if (list.isDefault) {
            return res.status(400).json({ error: 'Listas Padrões não podem ser editadas.' })
        }

        await list.destroy()

        return res.json({ message: 'Lista deletada.' })
    } catch (err) {
        req.log.error({ err }, 'Erro em deleteList')
        return res.status(500).json({ error: 'Erro ao deletar lista.' })
    }
}

export const addBookToList = async (req, res) => {
    try {
        const list = await BookList.findByPk(req.params.id)

        if (!list) {
            return res.status(404).json({ error: 'Lista não encontrada.' })
        }

        if (list.userId !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        const alreadyInList = await BookListItem.findOne({
            where: { listId: list.id, bookId: req.body.bookId }
        })

        if (alreadyInList) {
            return res.status(400).json({ error: 'Este livro já está nesta lista.' })
        }

        const item = await BookListItem.create({
            listId: list.id,
            bookId: req.body.bookId
        })

        return res.status(201).json(item)
    } catch (err) {
        req.log.error({ err }, 'Erro em addBookToList')
        return res.status(500).json({ error: 'Erro ao adicionar livro à lista.' })
    }
}

export const removeBookFromList = async (req, res) => {
    try {
        const list = await BookList.findByPk(req.params.id)

        if (!list) {
            return res.status(404).json({ error: 'Lista não encontrada.' })
        }

        if (list.userId !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        const item = await BookListItem.findOne({
            where: { listId: list.id, bookId: req.params.bookId }
        })

        if (!item) {
            return res.status(404).json({ error: 'Este livro não está nessa lista' })
        }

        await item.destroy()

        return res.json({ message: 'Livro removido da lista.' })
    } catch (err) {
        req.log.error({ err }, 'Erro em removeBookFromList')
        return res.status(500).json({ error: 'Erro ao remover livro da lista.' })
    }
}