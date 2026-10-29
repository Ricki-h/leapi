import Post from '../models/Post.js'
import Like from '../models/Like.js'
import User from '../models/User.js'
import sequelize from '../config/database.js'
import { Op } from 'sequelize'

const USER_PUBLIC_ATTRIBUTES = ['id', 'name', 'username', 'avatarUrl']

/**
 * Helper para gerar subqueries dinâmicas protegidas contra SQL Injection
 */
const getPostSocialAttributes = (userId, postTableAlias = 'Post') => {
  const binds = {}
  let likedExpr = 'FALSE'
  let isFollowingExpr = 'FALSE'
  let followsYouExpr = 'FALSE'

  if (userId) {
    binds.currentUserId = userId
    likedExpr = `EXISTS (SELECT 1 FROM "Likes" WHERE "Likes"."postId" = "${postTableAlias}"."id" AND "Likes"."userId" = $currentUserId)`
    isFollowingExpr = `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followingId" = "${postTableAlias}"."userId" AND "Follows"."followerId" = $currentUserId)`
    followsYouExpr = `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followerId" = "${postTableAlias}"."userId" AND "Follows"."followingId" = $currentUserId)`
  }

  return {
    binds,
    attributes: [
      [
        sequelize.literal(`(SELECT COUNT(*) FROM "Likes" WHERE "Likes"."postId" = "${postTableAlias}"."id")`),
        'likesCount'
      ],
      [
        sequelize.literal(`(SELECT COUNT(*) FROM "Posts" AS "Replies" WHERE "Replies"."parentId" = "${postTableAlias}"."id")`),
        'repliesCount'
      ],
      [sequelize.literal(likedExpr), 'likedByUser'],
      [sequelize.literal(isFollowingExpr), 'isFollowingAuthor'],
      [sequelize.literal(followsYouExpr), 'authorFollowsYou']
    ]
  }
}

export const createPost = async (req, res) => {
  try {
    const { content, parentId } = req.body

    if (parentId) {
      const parent = await Post.findByPk(parentId)
      if (!parent) {
        return res.status(404).json({ error: 'Post original não encontrado.' })
      }
    }

    const post = await Post.create({
      content,
      parentId: parentId || null,
      userId: req.user.id
    })

    return res.status(201).json(post)
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao criar post.' })
  }
}

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id)

    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado.' })
    }

    if (post.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    await post.destroy()
    return res.json({ message: 'Post deletado com sucesso.' })
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao excluir post.' })
  }
}

export const getPost = async (req, res) => {
  try {
    const userId = req.user?.id || null
    const { attributes, binds } = getPostSocialAttributes(userId, 'Post')
    const replySocial = getPostSocialAttributes(userId, 'replies')

    const post = await Post.findByPk(req.params.id, {
      bind: { ...binds, ...replySocial.binds },
      attributes: { include: attributes },
      include: [
        { model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES },
        {
          model: Post,
          as: 'parent',
          attributes: ['id'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
        },
        {
          model: Post,
          as: 'replies',
          attributes: { include: replySocial.attributes },
          include: [{ model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES }]
        }
      ]
    })

    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado.' })
    }

    return res.json(post)
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao buscar post.' })
  }
}

export const getUserPosts = async (req, res) => {
  try {
    const userId = req.user?.id || null
    const { attributes, binds } = getPostSocialAttributes(userId, 'Post')

    const posts = await Post.findAll({
      where: { userId: req.params.userId, parentId: null },
      bind: binds,
      attributes: { include: attributes },
      include: [{ model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES }],
      order: [['createdAt', 'DESC']]
    })

    return res.json(posts)
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao buscar posts do usuário.' })
  }
}

export const getUserPostsAndReplies = async (req, res) => {
  try {
    const userId = req.user?.id || null
    const { attributes, binds } = getPostSocialAttributes(userId, 'Post')

    const posts = await Post.findAll({
      where: { userId: req.params.userId },
      bind: binds,
      attributes: { include: attributes },
      include: [
        { model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES },
        {
          model: Post,
          as: 'parent',
          attributes: ['id'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    })

    return res.json(posts)
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao buscar postagens e respostas.' })
  }
}

export const getFeed = async (req, res) => {
  try {
    const userId = req.user?.id || null
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = 10
    const offset = (page - 1) * limit
    const seed = (req.query.seed || '').replace(/[^a-zA-Z0-9]/g, '') || Date.now().toString()

    const { attributes, binds } = getPostSocialAttributes(userId, 'Post')

    const posts = await Post.findAll({
      where: { parentId: null },
      bind: { ...binds, seedParam: seed },
      attributes: { include: attributes },
      include: [{ model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES }],
      order: [[sequelize.literal('md5("Post"."id"::text || $seedParam)'), 'ASC']],
      limit,
      offset
    })

    const hasMore = posts.length === limit

    return res.json({
      posts,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      seed
    })
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao carregar feed.' })
  }
}

export const getFollowingFeed = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado.' })
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = 10
    const offset = (page - 1) * limit

    const { attributes, binds } = getPostSocialAttributes(userId, 'Post')

    const posts = await Post.findAll({
      where: {
        parentId: null,
        userId: {
          [Op.in]: sequelize.literal(`(SELECT "followingId" FROM "Follows" WHERE "followerId" = $currentUserId)`)
        }
      },
      bind: binds,
      attributes: { include: attributes },
      include: [{ model: User, as: 'user', attributes: USER_PUBLIC_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    const hasMore = posts.length === limit

    return res.json({
      posts,
      hasMore,
      nextPage: hasMore ? page + 1 : null
    })
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao carregar feed de seguidos.' })
  }
}

export const likePost = async (req, res) => {
  try {
    const postId = req.params.id
    const userId = req.user.id

    const post = await Post.findByPk(postId)
    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado.' })
    }

    const [like, created] = await Like.findOrCreate({
      where: { userId, postId }
    })

    if (!created) {
      return res.status(400).json({ error: 'Você já curtiu esse post.' })
    }

    return res.status(201).json({ message: 'Post curtido.' })
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao curtir post.' })
  }
}

export const unlikePost = async (req, res) => {
  try {
    const deletedCount = await Like.destroy({
      where: { userId: req.user.id, postId: req.params.id }
    })

    if (!deletedCount) {
      return res.status(404).json({ error: 'Curtida não encontrada.' })
    }

    return res.json({ message: 'Curtida removida.' })
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao descurtir post.' })
  }
}