// middlewares/auditMutations.js
import AuditLog from '../models/AuditLog.js'
import logger from '../config/logger.js'

const SKIP_METHODS = ['GET', 'HEAD', 'OPTIONS']
const SENSITIVE_KEYS = ['password', 'currentPassword', 'newPassword', 'token']
const MAX_BODY_CHARS = 10000

const sanitizeBody = (body) => {
    if (!body || typeof body !== 'object') return null

    const clean = { ...body }
    for (const key of SENSITIVE_KEYS) {
        if (key in clean) clean[key] = '[REDACTED]'
    }

    return JSON.stringify(clean).length > MAX_BODY_CHARS ? { truncated: true } : clean
}

export default function auditMutations(req, res, next) {
    if (SKIP_METHODS.includes(req.method)) return next()

    res.on('finish', () => {
        // Padrão da rota (ex.: /users/:id/promote) em vez do valor real
        const routePattern = req.route ? `${req.baseUrl}${req.route.path}` : req.path

        AuditLog.create({
            action: `${req.method} ${routePattern}`,
            userId: req.user?.id ?? null,
            method: req.method,
            path: req.originalUrl.split('?')[0],
            statusCode: res.statusCode,
            ip: req.ip,
            userAgent: req.get('user-agent')?.slice(0, 300),
            requestId: req.id,
            metadata: { params: req.params, body: sanitizeBody(req.body) }
        }).catch(err => logger.error({ err }, 'Falha ao gravar auditoria automática'))
    })

    next()
}