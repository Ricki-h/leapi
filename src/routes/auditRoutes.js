import { Router } from 'express'
import { getAuditLogs, getAuditLogById } from '../controllers/auditController.js'
import { authenticated, isAdmin } from '../middlewares/auth.js'

const router = Router()
router.get('/', authenticated, isAdmin, getAuditLogs)
router.get('/:id', getAuditLogById)
export default router