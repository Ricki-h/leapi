import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import user from '../models/User.js'

export const register = async (req, res) => {
    try {
        const { name, email, password, birthDate, bio } = req.body

        const userExists = await User.findOne({ where: {email} })
        if (userExists) {
            return res.status(400)
        }
    }
}