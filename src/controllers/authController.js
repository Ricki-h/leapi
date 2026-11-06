import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { Op } from 'sequelize'
import BookList from '../models/BookList.js'

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
}

const publicUser = (user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role
})

export const register = async (req, res) => {
    try {
        const { name, username, email, password, birthDate } = req.body

        const userExists = await User.findOne({ where: {
            [Op.or]: [
            { email },
            { username: username.toLowerCase() }
            ]
        } })
        if (userExists) {
            if (userExists.email == email) {
                return res.status(400).json({error: 'Email já cadastrado.'})
            }
            return res.status(400).json({ error: 'Nome de usuário já cadastrado.' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await User.create({
            name,
            email,
            username: username.toLowerCase(),
            password: hashedPassword,
            birthDate
        })

        await BookList.bulkCreate([
            { name: 'Pretendo ler', isDefault: true, isPrivate: false, userId: user.id },
            { name: 'Lendo', isDefault: true, isPrivate: false, userId: user.id },
            { name: 'Lido', isDefault: true, isPrivate: false, userId: user.id }
        ])

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.cookie('auth_token', token, cookieOptions)

        return res.json({ message: 'Login realizado com sucesso!', user: publicUser(user) })
    } catch (err) {
        return res.status(400).json({ error: err.message })
    }
}

export const login = async (req, res) => {
    try {
        const { login, password } = req.body

        const user = await User.findOne({ where: {
            [Op.or]: [
                { email: login },
                { username: login.toLowerCase() }
            ]
        } })
        if (!user) {
            return res.status(401).json({ error: 'Email ou senha inválidos.' })
        }

        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Email ou senha inválidos.' })
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.cookie('auth_token', token, cookieOptions)

        return res.json({ message: 'Login realizado com sucesso!', user: publicUser(user) })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const logout = (req, res) => {
    res.clearCookie('auth_token', { ...cookieOptions, maxAge: undefined })
    return res.json({ message: 'Logout realizado.' })
}