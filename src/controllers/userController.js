import bcrypt from 'bcrypt'
import User from '../models/User.js'

export const getUser = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.params.username },
            attributes: { exclude: ['password', 'emailVerifyToken', 'resetPasswordToken', 'resetPasswordExpires'] }
        })

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' })
        }

        return res.json(user)
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