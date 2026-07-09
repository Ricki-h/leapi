import Post from '../models/Post.js'
import Like from '../models/Like.js'
import User from '../models/User.js'
import sequelize from '../config/database.js'


const userAttrs = ['id', 'name', 'username', 'avatarUrl']

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
        return res.status(500).json({ error: err.message })
    }
}

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findOne({
            where: { id: req.params.id }
        })

        if (!post) {
            return res.status(404).json({ error: 'Post não encontrado.' })
        }

        if (post.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        await post.destroy()

        return res.json({ message: 'Post deletado.' })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getPost = async (req, res) => {
    try {
        const userId = req.user?.id || null
        const post = await Post.findByPk(req.params.id, {
            include: [
                { model: User, as: 'user', attributes: userAttrs },
                {
                    model: Post,
                    as: 'replies',
                    include: [{ model: User, as: 'user', attributes: userAttrs }]
                }
            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Likes" WHERE "Likes"."postId" = "Post"."id")`),
                        'likesCount'
                    ],
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Posts" AS "Replies" WHERE "Replies"."parentId" = "Post"."id")`),
                        'repliesCount'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Likes" WHERE "Likes"."postId" = "Post"."id" AND "Likes"."userId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'likedByUser'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followingId" = "Post"."userId" AND "Follows"."followerId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'isFollowingAuthor'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followerId" = "Post"."userId" AND "Follows"."followingId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'authorFollowsYou'
                    ]
                ]
            },
        })

        if (!post) {
            return res.status(404).json({ error: 'Post não encontrado.' })
        }

        return res.json(post)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getUserPosts = async (req, res) => {
    try {
        const userId = req.user?.id || null
        const posts = await Post.findAll({
            where: { userId: req.params.userId, parentId: null },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Likes" WHERE "Likes"."postId" = "Post"."id")`),
                        'likesCount'
                    ],
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Posts" AS "Replies" WHERE "Replies"."parentId" = "Post"."id")`),
                        'repliesCount'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Likes" WHERE "Likes"."postId" = "Post"."id" AND "Likes"."userId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'likedByUser'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followingId" = "Post"."userId" AND "Follows"."followerId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'isFollowingAuthor'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followerId" = "Post"."userId" AND "Follows"."followingId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'authorFollowsYou'
                    ]
                ]
            },
            order: [['createdAt', 'DESC']]
        })

        return res.json(posts)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const getUserPostsAndReplies = async (req, res) => {
    try {
        const userId = req.user?.id || null
        const posts = await Post.findAll({
            where: { userId: req.params.userId },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Likes" WHERE "Likes"."postId" = "Post"."id")`),
                        'likesCount'
                    ],
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Posts" AS "Replies" WHERE "Replies"."parentId" = "Post"."id")`),
                        'repliesCount'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Likes" WHERE "Likes"."postId" = "Post"."id" AND "Likes"."userId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'likedByUser'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followingId" = "Post"."userId" AND "Follows"."followerId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'isFollowingAuthor'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followerId" = "Post"."userId" AND "Follows"."followingId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'authorFollowsYou'
                    ]
                ]
            },
            include: [
                { model: User, as: 'user', attributes: userAttrs },
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
        return res.status(500).json({ error: err.message })
    }
}

export const getFeed = async (req, res) => {
    try {
        const userId = req.user?.id || null
        const page = parseInt(req.query.page) || 1
        const limit = 10
        const offset = (page - 1) * limit

        const seed = (req.query.seed || '').replace(/[^a-zA-Z0-9]/g, '') || Date.now().toString()

        const posts = await Post.findAll({
            where: { parentId: null },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Likes" WHERE "Likes"."postId" = "Post"."id")`),
                        'likesCount'
                    ],
                    [
                        sequelize.literal(`(SELECT COUNT(*) FROM "Posts" AS "Replies" WHERE "Replies"."parentId" = "Post"."id")`),
                        'repliesCount'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Likes" WHERE "Likes"."postId" = "Post"."id" AND "Likes"."userId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'likedByUser'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followingId" = "Post"."userId" AND "Follows"."followerId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'isFollowingAuthor'
                    ],
                    [
                        sequelize.literal(
                            userId
                                ? `EXISTS (SELECT 1 FROM "Follows" WHERE "Follows"."followerId" = "Post"."userId" AND "Follows"."followingId" = '${userId}')`
                                : 'FALSE'
                        ),
                        'authorFollowsYou'
                    ]
                ]
            },
            include: [
                { model: User, as: 'user', attributes: userAttrs }
            ],
            order: [[sequelize.literal(`md5("Post"."id"::text || '${seed}')`), 'ASC']],
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
        return res.status(500).json({ error: err.message })
    }
}

export const likePost = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id)
        if (!post) {
            return res.status(404).json({ error: 'Post não encontrado.' })
        }

        const existing = await Like.findOne({
            where: { userId: req.user.id, postId: post.id }
        })
        if (existing) {
            return res.status(400).json({ error: 'Você já curtiu esse post.' })
        }

        await Like.create({ userId: req.user.id, postId: post.id })

        return res.status(201).json({ message: 'Post curtido.' })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const unlikePost = async (req, res) => {
    try {
        const like = await Like.findOne({
            where: { userId: req.user.id, postId: req.params.id }
        })
        if (!like) {
            return res.status(404).json({ error: 'Curtida não encontrada.' })
        }

        await like.destroy()

        return res.json({ message: 'Curtida removida.' })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}