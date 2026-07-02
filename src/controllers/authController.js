import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { Op } from 'sequelize'
import crypto from 'crypto'
import { sendVerificationEmail, sendResetPasswordEmail } from '../services/emailService.js'
import BookList from '../models/BookList.js'

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
        const emailVerifyToken = crypto.randomBytes(32).toString('hex')

        const user = await User.create({
            name,
            email,
            username: username.toLowerCase(),
            password: hashedPassword,
            birthDate,
            emailVerifyToken
        })

        await BookList.bulkCreate([
            { name: 'Pretendo ler', isDefault: true, isPrivate: false, userId: user.id },
            { name: 'Lendo', isDefault: true, isPrivate: false, userId: user.id },
            { name: 'Lido', isDefault: true, isPrivate: false, userId: user.id }
        ])

        await sendVerificationEmail(email, emailVerifyToken)

        return res.status(201).json({
            message: 'Conta criada! Verifique seu email para ativar sua conta.'
        })
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

        if (!user.emailVerified) {
            return res.status(401).json({ error: 'Confirme seu email antes de fazer login.' })
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

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query
        
        const user = await User.findOne({ where: { emailVerifyToken: token } })

        if (!user) {
            res.status(400).json({ error: 'Token inválido.' })
        }

        await user.update({
            emailVerified: true,
            emailVerifyToken: null
        })

        return res.json({ message: 'Email verificado com sucesso! Faça login.' })
    } catch(err) {
        return res.json(500).json({ error: err.message })
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body

        const user = await User.findOne({ where: { email } })

        if (!user) {
            return res.json({ message: 'Se este email estiver cadastrado, você receberá as instruções.' })
        }

        const resetToken = crypto.randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 60 * 60 * 1000)

        await user.update({
            resetPasswordToken: resetToken,
            resetPasswordExpires: expires
        })

        await sendResetPasswordEmail(email, resetToken)

        return res.json({ message: 'Se este email estiver cadastrado, você receberá as instruções.' })
    } catch(err) {
        return res.status(500).json({ error: err.message })
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body

        const user = await User.findOne({ where: {
            resetPasswordToken: token,
            resetPasswordExpires: { [Op.gt]: new Date() }
        } })

        if (!user) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await user.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        })

        return res.json({ message: 'Senha alterada com sucesso! Faça login.' })
    } catch(err) {
        return res.status(500).json({ error: err.message })
    }
}