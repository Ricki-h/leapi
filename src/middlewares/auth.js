import jwt from 'jsonwebtoken'

export const authenticated = (req, res, next) => {
    const token = req.cookies.auth_token

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não encontrado.' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' })
    }
}

export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' })
    }
    next()
}