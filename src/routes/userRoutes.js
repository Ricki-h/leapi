import { Router } from 'express'
import { getUser, updateMe, updatePassword, promoteUser, deleteUser, deleteMe, followUser, getFollowers, getFollowing, updateAvatar, removeAvatar, searchUsers } from '../controllers/userController.js'
import { authenticated, isAdmin } from '../middlewares/auth.js'
import uploadAvatar from '../middlewares/upload.js'

const router = Router()

// Rotas fixas primeiro (antes de /:username)
router.get('/search', authenticated, searchUsers)

// Rotas do usuário logado
router.patch('/me', authenticated, updateMe)
router.patch('/me/password', authenticated, updatePassword)
router.patch('/me/avatar', authenticated, uploadAvatar, updateAvatar)
router.delete('/me/avatar', authenticated, removeAvatar)
router.delete('/me', authenticated, deleteMe)

// Rotas com parâmetro dinâmico por último
router.get('/:username', authenticated, getUser)
router.get('/:username/followers', authenticated, getFollowers)
router.get('/:username/following', authenticated, getFollowing)
router.post('/:username/follow', authenticated, followUser)

router.patch('/:id/promote', authenticated, isAdmin, promoteUser)
router.delete('/:id', authenticated, isAdmin, deleteUser)

export default router