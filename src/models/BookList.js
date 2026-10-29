import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import User from './User.js'
import Book from './Book.js'


const BookList = sequelize.define(
  'BookList',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] }
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    indexes: [{ fields: ['userId'] }]
  }
)

// Livros que fazem parte de uma lista (com ordem)
const BookListItem = sequelize.define(
  'BookListItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    listId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    bookId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    indexes: [
      // impede o mesmo livro duas vezes na mesma lista
      { unique: true, fields: ['listId', 'bookId'] },
      { fields: ['listId', 'position'] }
    ]
  }
)

// SavedList: listas de outros usuários que alguém salvou
const SavedList = sequelize.define(
  'SavedList',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    listId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    indexes: [
      // um usuário só pode salvar a mesma lista uma vez
      { unique: true, fields: ['userId', 'listId'] },
      { fields: ['listId'] }
    ]
  }
)

//Associações

// Lista <-> dono
BookList.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })
User.hasMany(BookList, { foreignKey: 'userId', as: 'lists', onDelete: 'CASCADE' })

// Lista <-> livros
BookList.hasMany(BookListItem, { foreignKey: 'listId', as: 'items', onDelete: 'CASCADE' })
BookListItem.belongsTo(BookList, { foreignKey: 'listId', as: 'list' })
BookListItem.belongsTo(Book, { foreignKey: 'bookId', as: 'book', onDelete: 'CASCADE' })
Book.hasMany(BookListItem, { foreignKey: 'bookId', as: 'listItems' })

// Listas salvas
SavedList.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })
User.hasMany(SavedList, { foreignKey: 'userId', as: 'savedLists' })
SavedList.belongsTo(BookList, { foreignKey: 'listId', as: 'list', onDelete: 'CASCADE' })
BookList.hasMany(SavedList, { foreignKey: 'listId', as: 'saves' })

//CONTROLLER: regras e handlers das rotas de lista

const USER_PUBLIC_ATTRIBUTES = ['id', 'name', 'username', 'avatarUrl']
const MAX_BOOKS_ON_CREATE = 200

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value)

const cleanText = (value, maxLength) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed || trimmed.length > maxLength) return null
  return trimmed
}

const booksCountAttribute = (tableAlias = 'BookList') => [
  sequelize.literal(
    `(SELECT COUNT(*) FROM "BookListItems" WHERE "BookListItems"."listId" = "${tableAlias}"."id")`
  ),
  'booksCount'
]

// Busca uma lista que o usuário pode ver

const findVisibleList = async (listId, viewerId, options = {}) => {
  if (!isUuid(listId)) return null
  const list = await BookList.findByPk(listId, options)
  if (!list) return null
  if (list.isPrivate && list.userId !== viewerId) return null
  return list
}

// Busca uma lista que o usuário pode editar (só o dono)

const loadOwnedList = async (req, res) => {
  const list = await findVisibleList(req.params.id, req.user.id)
  if (!list) {
    res.status(404).json({ error: 'Lista não encontrada.' })
    return null
  }
  if (list.userId !== req.user.id) {
    res.status(403).json({ error: 'Sem permissão.' })
    return null
  }
  return list
}

// 1. MONTAR LISTA

export const createList = async (req, res) => {
  try {
    const name = cleanText(req.body.name, 100)
    if (!name) {
      return res.status(400).json({ error: 'Informe um nome de até 100 caracteres.' })
    }

    let description = null
    if (req.body.description != null && req.body.description !== '') {
      description = cleanText(req.body.description, 500)
      if (!description) {
        return res.status(400).json({ error: 'Descrição inválida (máximo 500 caracteres).' })
      }
    }

    const isPrivate = req.body.isPrivate === undefined ? false : req.body.isPrivate
    if (typeof isPrivate !== 'boolean') {
      return res.status(400).json({ error: 'isPrivate deve ser true ou false.' })
    }

    const rawBookIds = req.body.bookIds ?? []
    if (!Array.isArray(rawBookIds) || rawBookIds.length > MAX_BOOKS_ON_CREATE) {
      return res.status(400).json({ error: 'Lista de livros inválida.' })
    }
    const bookIds = [...new Set(rawBookIds)]
    if (!bookIds.every(isUuid)) {
      return res.status(400).json({ error: 'Há ids de livros inválidos.' })
    }
    if (bookIds.length) {
      const found = await Book.count({ where: { id: bookIds } })
      if (found !== bookIds.length) {
        return res.status(404).json({ error: 'Um ou mais livros não foram encontrados.' })
      }
    }

    // Transação: ou cria a lista COM os livros, ou não cria nada
    const list = await sequelize.transaction(async (transaction) => {
      const created = await BookList.create(
        { name, description, isPrivate, userId: req.user.id },
        { transaction }
      )
      if (bookIds.length) {
        await BookListItem.bulkCreate(
          bookIds.map((bookId, position) => ({ listId: created.id, bookId, position })),
          { transaction }
        )
      }
      return created
    })

    return res.status(201).json(list)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao criar lista.' })
  }
}

export const addBookToList = async (req, res) => {
  try {
    const list = await loadOwnedList(req, res)
    if (!list) return

    const { bookId } = req.body
    if (!isUuid(bookId)) {
      return res.status(400).json({ error: 'Livro inválido.' })
    }

    const book = await Book.findByPk(bookId)
    if (!book) {
      return res.status(404).json({ error: 'Livro não encontrado.' })
    }

    const lastPosition = await BookListItem.max('position', { where: { listId: list.id } })
    const position = lastPosition == null ? 0 : lastPosition + 1

    const [, created] = await BookListItem.findOrCreate({
      where: { listId: list.id, bookId },
      defaults: { position }
    })

    if (!created) {
      return res.status(400).json({ error: 'Esse livro já está na lista.' })
    }

    return res.status(201).json({ message: 'Livro adicionado à lista.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao adicionar livro.' })
  }
}

export const removeBookFromList = async (req, res) => {
  try {
    const list = await loadOwnedList(req, res)
    if (!list) return

    if (!isUuid(req.params.bookId)) {
      return res.status(400).json({ error: 'Livro inválido.' })
    }

    const deleted = await BookListItem.destroy({
      where: { listId: list.id, bookId: req.params.bookId }
    })

    if (!deleted) {
      return res.status(404).json({ error: 'Esse livro não está na lista.' })
    }

    return res.json({ message: 'Livro removido da lista.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao remover livro.' })
  }
}

// 2. RENOMEAR (e editar descrição)

export const updateList = async (req, res) => {
  try {
    const list = await loadOwnedList(req, res)
    if (!list) return

    const changes = {}

    if (req.body.name !== undefined) {
      if (list.isDefault) {
        return res.status(400).json({ error: 'Listas padrão não podem ser renomeadas.' })
      }
      const name = cleanText(req.body.name, 100)
      if (!name) {
        return res.status(400).json({ error: 'Informe um nome de até 100 caracteres.' })
      }
      changes.name = name
    }

    if (req.body.description !== undefined) {
      if (req.body.description === null || req.body.description === '') {
        changes.description = null
      } else {
        const description = cleanText(req.body.description, 500)
        if (!description) {
          return res.status(400).json({ error: 'Descrição inválida (máximo 500 caracteres).' })
        }
        changes.description = description
      }
    }

    if (req.body.isPrivate !== undefined) {
      if (typeof req.body.isPrivate !== 'boolean') {
        return res.status(400).json({ error: 'isPrivate deve ser true ou false.' })
      }
      changes.isPrivate = req.body.isPrivate
    }

    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: 'Nenhuma alteração informada.' })
    }

    await list.update(changes)
    return res.json(list)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao atualizar lista.' })
  }
}

export const deleteList = async (req, res) => {
  try {
    const list = await loadOwnedList(req, res)
    if (!list) return

    if (list.isDefault) {
      return res.status(400).json({ error: 'Listas padrão não podem ser excluídas.' })
    }

    await list.destroy() // itens e salvamentos saem em cascata
    return res.json({ message: 'Lista excluída com sucesso.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao excluir lista.' })
  }
}

// 3. VER LISTAS (minhas e de outros usuários)

export const getMyLists = async (req, res) => {
  try {
    const userId = req.user.id

    const [owned, saved] = await Promise.all([
      BookList.findAll({
        where: { userId },
        attributes: { include: [booksCountAttribute()] },
        order: [
          ['isDefault', 'DESC'],
          ['createdAt', 'DESC']
        ]
      }),
      SavedList.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: BookList,
            as: 'list',
            required: true,
            where: { isPrivate: false }, // se o dono tornou privada, some da sua biblioteca
            attributes: { include: [booksCountAttribute('list')] },
            include: [{ model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES }]
          }
        ]
      })
    ])

    return res.json({ owned, saved: saved.map((s) => s.list) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao buscar suas listas.' })
  }
}

export const getUserLists = async (req, res) => {
  try {
    const viewerId = req.user?.id || null
    const { userId } = req.params

    if (!isUuid(userId)) {
      return res.status(404).json({ error: 'Usuário não encontrado.' })
    }

    const where = { userId }
    if (viewerId !== userId) where.isPrivate = false // outros só veem as públicas

    const lists = await BookList.findAll({
      where,
      attributes: { include: [booksCountAttribute()] },
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'DESC']
      ]
    })

    return res.json(lists)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao buscar listas do usuário.' })
  }
}

export const getList = async (req, res) => {
  try {
    const viewerId = req.user?.id || null

    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Lista não encontrada.' })
    }

    const list = await BookList.findByPk(req.params.id, {
      attributes: { include: [booksCountAttribute()] },
      include: [
        { model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES },
        {
          model: BookListItem,
          as: 'items',
          include: [{ model: Book, as: 'book' }]
        }
      ],
      order: [[{ model: BookListItem, as: 'items' }, 'position', 'ASC']]
    })

    if (!list || (list.isPrivate && list.userId !== viewerId)) {
      return res.status(404).json({ error: 'Lista não encontrada.' })
    }

    const [savedCount, savedByViewer] = await Promise.all([
      SavedList.count({ where: { listId: list.id } }),
      viewerId ? SavedList.findOne({ where: { userId: viewerId, listId: list.id } }) : null
    ])

    return res.json({
      ...list.toJSON(),
      isOwner: viewerId === list.userId,
      savedCount,
      savedByUser: Boolean(savedByViewer)
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao buscar lista.' })
  }
}

// 4. SALVAR/DESSALVAR LISTA DE OUTRO USUÁRIO

export const saveList = async (req, res) => {
  try {
    const userId = req.user.id
    const list = await findVisibleList(req.params.id, userId)

    if (!list) {
      return res.status(404).json({ error: 'Lista não encontrada.' })
    }
    if (list.userId === userId) {
      return res.status(400).json({ error: 'Você não pode salvar a sua própria lista.' })
    }

    const [, created] = await SavedList.findOrCreate({
      where: { userId, listId: list.id }
    })

    if (!created) {
      return res.status(400).json({ error: 'Você já salvou essa lista.' })
    }

    return res.status(201).json({ message: 'Lista salva.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao salvar lista.' })
  }
}

export const unsaveList = async (req, res) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Lista salva não encontrada.' })
    }

    const deleted = await SavedList.destroy({
      where: { userId: req.user.id, listId: req.params.id }
    })

    if (!deleted) {
      return res.status(404).json({ error: 'Lista salva não encontrada.' })
    }

    return res.json({ message: 'Lista removida dos salvos.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno ao remover lista salva.' })
  }
}

export { BookListItem, SavedList }
export default BookList