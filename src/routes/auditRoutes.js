import { Router } from 'express'
import { getAuditLogs } from '../controllers/auditController.js'
import { authenticated, isAdmin } from '../middlewares/auth.js'

const router = Router()
router.get('/', authenticated, isAdmin, getAuditLogs)
export default router