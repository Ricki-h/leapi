import { Router } from 'express'
import { getUser, updateMe, updatePassword, promoteUser, deleteUser, deleteMe, followUser, getFollowers, getFollowing, updateAvatar, removeAvatar, searchUsers } from '../controllers/userController.js'
import { authenticated, isAdmin } from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'

const router = Router()

// 1. ROTAS ESTÁTICAS E DE BUSCA (Devem vir primeiro!)
router.get('/search', authenticated, searchUsers)

// 2. ROTAS PRÓPRIAS DO USUÁRIO LOGADO (/me)
router.patch('/me', authenticated, updateMe)
router.patch('/me/password', authenticated, updatePassword)
router.delete('/me', authenticated, deleteMe)
router.patch('/me/avatar', authenticated, upload.single('avatar'), updateAvatar)
router.delete('/me/avatar', authenticated, removeAvatar)

// 3. ROTAS COM PARÂMETROS DINÂMICOS (Devem vir por último!)
router.get('/:username', authenticated, getUser)
router.get('/:username/followers', authenticated, getFollowers)
router.get('/:username/following', authenticated, getFollowing)
router.post('/:username/follow', authenticated, followUser)

router.patch('/:id/promote', authenticated, isAdmin, promoteUser)
router.delete('/:id', authenticated, isAdmin, deleteUser)

export default router