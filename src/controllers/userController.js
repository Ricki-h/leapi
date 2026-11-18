import bcrypt from 'bcrypt'
import User from '../models/User.js'
import Follow from '../models/Follow.js'
import Post from '../models/Post.js'
import cloudinary from '../config/cloudinary.js'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'

const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dogfe2npo/image/upload/v1777050334/deafultAvatar_1_yl8fl5.png'

async function deleteAvatarFromCloud(user) {
    if (!user.avatarCloudinaryId) return
    try {
        await cloudinary.uploader.destroy(user.avatarCloudinaryId)
    } catch (err) {
        console.error('Falha ao apagar avatar no Cloudinary:', err)
    }
}

async function deleteUserData(user) {
    await sequelize.transaction(async (t) => {
        await Follow.destroy({
            where: {
                [Op.or]: [{ followerId: user.id }, { followingId: user.id }]
            },
            transaction: t
        })

        await Post.destroy({ where: { userId: user.id }, transaction: t })

        await user.destroy({ transaction: t })
    })
    await deleteAvatarFromCloud(user)
}

export const getUser = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.params.username },
            attributes: ['id', 'name', 'username', 'bio', 'avatarUrl', 'createdAt']
        })

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        const [followersCount, followingCount, isFollowing] = await Promise.all([
            Follow.count({ where: { followingId: user.id } }),
            Follow.count({ where: { followerId: user.id } }),
            Follow.findOne({ where: { followerId: req.user.id, followingId: user.id } })
        ])

        return res.json({
            ...user.toJSON(),
            followersCount,
            followingCount,
            isFollowing: Boolean(isFollowing)
        })
    } catch (err) {
        console.error('Erro em getUser:', err)
        return res.status(500).json({ error: 'Erro ao buscar usuário.' })
    }
}

export const updateMe = async (req, res) => {
    try {
        const { name, username, bio } = req.body
        const user = await User.findByPk(req.user.id)

        if (username && username.toLowerCase() !== user.username) {
            const usernameExists = await User.findOne({ where: { username: username.toLowerCase() } })
            if (usernameExists) {
                return res.status(409).json({ error: 'Nome de usuário já cadastrado.' })
            }
        }

        await user.update({
            name: name || user.name,
            username: username ? username.toLowerCase() : user.username,
            bio: bio !== undefined ? bio : user.bio
        })

        return res.json({
            id: user.id,
            name: user.name,
            username: user.username,
            bio: user.bio,
            email: user.email
        })
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Nome de usuário já cadastrado.' })
        }
        console.error('Erro em updateMe:', err)
        return res.status(500).json({ error: 'Erro ao editar usuário.' })
    }
}

export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' })
        }

        const user = await User.findByPk(req.user.id)

        const passwordMatch = currentPassword ? await bcrypt.compare(currentPassword, user.password) : false
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Senha atual incorreta.' })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await user.update({ password: hashedPassword })

        return res.json({ message: 'Senha alterada com sucesso.' })
    } catch (err) {
        console.error('Erro em updatePassword:', err)
        return res.status(500).json({ error: 'Erro ao atualizar a senha.' })
    }
}

export const promoteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id)

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        await user.update({ role: 'admin' })

        return res.json({ message: `${user.name} agora é um administrador.` })
    } catch (err) {
        console.error('Erro em promoteUser:', err)
        return res.status(500).json({ error: 'Erro ao promover usuário.' })
    }
}

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id)

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        await deleteUserData(user)

        return res.json({ message: 'Usuário deletado.' })
    } catch (err) {
        console.error('Erro em deleteUser:', err)
        return res.status(500).json({ error: 'Erro ao deletar usuário.' })
    }
}

export const deleteMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id)

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        await deleteUserData(user)

        return res.json({ message: 'Conta deletada com sucesso.' })
    } catch (err) {
        console.error('Erro em deleteMe:', err)
        return res.status(500).json({ error: 'Erro ao deletar usuário.' })
    }
}

export const followUser = async (req, res) => {
    try {
        const following = await User.findOne({ where: { username: req.params.username } })

        if (!following) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        if (req.user.id === following.id) {
            return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' })
        }

        const [follow, created] = await Follow.findOrCreate({
            where: { followerId: req.user.id, followingId: following.id }
        })

        if (!created) {
            await follow.destroy()
            return res.json({ message: `Você deixou de seguir @${following.username}.` })
        }

        return res.json({ message: `Você está seguindo @${following.username}.` })
    } catch (err) {
        console.error('Erro em followUser:', err)
        return res.status(500).json({ error: 'Erro ao seguir usuário.' })
    }
}

export const getFollowers = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = 10
        const offset = (page - 1) * limit

        const user = await User.findOne({
            where: { username: req.params.username }
        })
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        const followers = await user.getFollowers({
            attributes: ['id', 'name', 'username', 'avatarUrl'],
            joinTableAttributes: [],
            order: [['id', 'ASC']],
            limit: limit + 1,
            offset
        })

        const hasMore = followers.length > limit

        return res.status(200).json({
            users: followers.slice(0, limit),
            hasMore
        })
    } catch (err) {
        console.error('Erro em getFollowers:', err)
        return res.status(500).json({ error: 'Erro ao buscar seguidores do usuário.' })
    }
}

export const getFollowing = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = 10
        const offset = (page - 1) * limit

        const user = await User.findOne({
            where: { username: req.params.username }
        })
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        const following = await user.getFollowing({
            attributes: ['id', 'name', 'username', 'avatarUrl'],
            joinTableAttributes: [],
            order: [['id', 'ASC']],
            limit: limit + 1,
            offset
        })

        const hasMore = following.length > limit

        return res.status(200).json({
            users: following.slice(0, limit),
            hasMore
        })
    } catch (err) {
        console.error('Erro em getFollowing:', err)
        return res.status(500).json({ error: 'Erro ao buscar quem o usuário está seguindo.' })
    }
}

export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada.' })
        }

        const user = await User.findByPk(req.user.id)
        const oldCloudinaryId = user.avatarCloudinaryId

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'avatars',
                    allowed_formats: ['jpg', 'png', 'webp'],
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
                        { quality: 'auto', fetch_format: 'auto' }
                    ]
                },
                (err, result) => {
                    if (err) return reject(err)
                    resolve(result)
                }
            )
            stream.end(req.file.buffer)
        })

        try {
            await user.update({
                avatarUrl: uploadResult.secure_url,
                avatarCloudinaryId: uploadResult.public_id
            })
        } catch (dbErr) {
            await cloudinary.uploader.destroy(uploadResult.public_id).catch(console.error)
            throw dbErr
        }

        if (oldCloudinaryId) {
            await cloudinary.uploader.destroy(oldCloudinaryId)
                .catch(err => console.error('Falha ao apagar foto antiga:', err))
        }

        return res.json({ avatarUrl: user.avatarUrl })
    } catch (err) {
        console.error('Erro em updateAvatar:', err)
        return res.status(500).json({ error: 'Erro ao atualizar a foto de perfil.' })
    }
}

export const removeAvatar = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id)
        const oldCloudinaryId = user.avatarCloudinaryId

        await user.update({
            avatarUrl: DEFAULT_AVATAR_URL,
            avatarCloudinaryId: null
        })

        if (oldCloudinaryId) {
            await cloudinary.uploader.destroy(oldCloudinaryId)
                .catch(err => console.error('Falha ao remover foto:', err))
        }

        return res.json({ message: 'Foto de perfil removida.', avatarUrl: DEFAULT_AVATAR_URL })
    } catch (err) {
        console.error('Erro em removeAvatar:', err)
        return res.status(500).json({ error: 'Erro ao remover foto de perfil.' })
    }
}

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&')

export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query

        // q pode chegar como array (?q=a&q=b) ou objeto, então confere o tipo
        if (typeof q !== 'string' || !q.trim()) {
            return res.json([])
        }

        const term = escapeLike(q.trim().replace(/^@/, '').slice(0, 50))
        const pattern = `%${term}%`

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: pattern } },
                    { username: { [Op.iLike]: pattern } }
                ]
            },
            attributes: ['id', 'name', 'username', 'avatarUrl'],
            order: [['username', 'ASC']],
            limit: 10
        })

        return res.json(users)
    } catch (err) {
        console.error('Erro em searchUsers:', err)
        return res.status(500).json({ error: 'Erro ao pesquisar usuários.' })
    }
}