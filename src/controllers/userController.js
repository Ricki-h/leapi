import bcrypt from 'bcrypt'
import User from '../models/User.js'
import Follow from '../models/Follow.js'
import cloudinary from '../config/cloudinary.js'
import { Op } from 'sequelize'

const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dogfe2npo/image/upload/v1777050334/deafultAvatar_1_yl8fl5.png'

export const getUser = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.params.username },
            attributes: { exclude: 'password' }
        })

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }
        
        const followersCount = await Follow.count({ where: { followingId: user.id } })
        const followingCount = await Follow.count({ where: { followerId: user.id } })

        const isFollowing = await Follow.findOne({ where: { followerId: req.user.id, followingId: user.id } }) || false

        return res.json({
            ...user.toJSON(),
            followersCount,
            followingCount,
            isFollowing
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const updateMe = async (req, res) => {
    try {
        const { name, username, bio } = req.body
        const user = await User.findByPk(req.user.id)

        if (username && username !== user.username) {
            const usernameExists = await User.findOne({ where: { username: username.toLowerCase() } })
            if (usernameExists) {
                return res.status(400).json({ error: 'Nome de usuário já cadastrado.' })
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
        res.status(500).json({ error: err.message })
    }
}

export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body

        const user = await User.findByPk(req.user.id)

        const passwordMatch = await bcrypt.compare(currentPassword, user.password)
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Senha atual incorreta.' })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await user.update({ password: hashedPassword })

        res.json({ message: 'Senha alterada com sucesso.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
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
        res.status(500).json({ error: err.message })
    }
}

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id)

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        await user.destroy()

        return res.json({ message: `Usuário deletado` })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const deleteMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id)

    await user.destroy()

    return res.json({ message: 'Conta deletada com sucesso.' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const followUser = async (req, res) => {
    try {
        const follower = await User.findByPk(req.user.id)
        const following = await User.findOne({ where: { username: req.params.username } })

        if (!following) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        if (follower.id === following.id) {
            return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' })
        }

        const alreadyFollowing = await Follow.findOne({
            where: { followerId: follower.id, followingId: following.id }
        })

        if (alreadyFollowing) {
            await alreadyFollowing.destroy()
            return res.json({ message: `Você deixou de seguir @${following.username}.` })
        }

        await Follow.create({ followerId: follower.id, followingId: following.id })
        return res.json({ message: `Você está seguindo @${following.username}.` })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const getFollowers = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.params.username },
            include: [{
                model: User,
                as: 'followers',
                attributes: ['id', 'name', 'username', 'avatarUrl'],
                through: { attributes: [] }
            }]
        })

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        return res.json(user.followers)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const getFollowing = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.params.username },
            include: [{
                model: User,
                as: 'following',
                attributes: ['id', 'name', 'username', 'avatarUrl'],
                through: { attributes: [] }
            }]
        })

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        return res.json(user.following)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada.' })
        }

        const user = await User.findByPk(req.user.id)

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'avatars' },
                (err, result) => {
                    if (err) return reject(err)
                    resolve(result)
                }
            )
            stream.end(req.file.buffer)
        })

        if (user.avatarCloudinaryId) {
            await cloudinary.uploader.destroy(user.avatarCloudinaryId)
        }

        await user.update({
            avatarUrl: uploadResult.secure_url,
            avatarCloudinaryId: uploadResult.public_id
        })

        return res.json({
            avatarUrl: user.avatarUrl
        })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const removeAvatar = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id)

        if (user.avatarCloudinaryId) {
            await cloudinary.uploader.destroy(user.avatarCloudinaryId)
        }

        await user.update({
            avatarUrl: DEFAULT_AVATAR_URL,
            avatarCloudinaryId: null
        })

        return res.json({ message: 'Foto de perfil removida.', avatarUrl: DEFAULT_AVATAR_URL })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query

        if (!q || !q.trim()) {
            return res.json([])
        }

        const query = `%${q.trim()}%`

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: query } },
                    { username: { [Op.iLike]: query } }
                ]
            },
            attributes: ['id', 'name', 'username', 'avatarUrl'],
            limit: 10
        })

        return res.json(users)
    } catch (err) {
        console.error('Erro no searchUsers:', err)
        return res.status(500).json({ error: err.message })
    }
}