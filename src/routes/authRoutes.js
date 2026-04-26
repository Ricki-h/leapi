import { Router } from 'express'
import { register, login, verifyEmail, forgotPassword, resetPassword } from '../controllers/authController.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/verificar-email', verifyEmail)
router.post('/esqueci-senha', forgotPassword)
router.post('/resetar-senha', resetPassword)

export default router