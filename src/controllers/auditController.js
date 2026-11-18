import { Op } from 'sequelize'
import AuditLog from '../models/AuditLog.js'
import User from '../models/User.js'

export const getAuditLogs = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200)

        const { userId, action, from, to, status } = req.query
        const where = {}

        if (userId) where.userId = userId
        if (action) where.action = { [Op.startsWith]: action }
        if (status) where.statusCode = { [Op.gte]: parseInt(status) } // ?status=400 mostra só erros
        if (from || to) {
            where.createdAt = {
                ...(from && { [Op.gte]: new Date(from) }),
                ...(to && { [Op.lte]: new Date(to) })
            }
        }

        const { rows, count } = await AuditLog.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit
        })

        return res.json({
            total: count,
            page,
            hasMore: (page - 1) * limit + rows.length < count,
            logs: rows
        })
    } catch (err) {
        req.log.error({ err }, 'Erro em getAuditLogs')
        return res.status(500).json({ error: 'Erro ao buscar logs.' })
    }
}

export const getAuditLogById = async (req, res) => {
    try {
        const log = await AuditLog.findByPk(req.params.id)
        if (!log) {
            return res.status(404).json({ error: 'Log não encontrado.' })
        }

        let user = null
        if (log.userId) {
            user = await User.findByPk(log.userId, {
                attributes: ['id', 'name', 'username', 'avatarUrl', 'email', 'role']
            })
        }

        return res.json({ log, user })
    } catch (err) {
        req.log?.error({ err }, 'Erro em getAuditLogById')
        return res.status(500).json({ error: 'Erro ao buscar detalhes do log.' })
    }
}