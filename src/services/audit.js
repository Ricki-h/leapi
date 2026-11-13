import AuditLog from '../models/AuditLog.js'
import logger from '../config/logger.js'

export function audit(req, action, metadata = {}) {
    return AuditLog.create({
        action,
        userId: req.user?.id ?? null,
        method: req.method,
        path: req.originalUrl?.split('?')[0].slice(0, 255),
        ip: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 300),
        requestId: req.id?.slice(0, 64),
        metadata
    }).catch(err => logger.error({ err, action }, 'Falha ao gravar auditoria'))
}