import { Router } from 'express'
import { getUser, updateMe, updatePassword, promoteUser, deleteUser, deleteMe, followUser, getFollowers, getFollowing, updateAvatar, removeAvatar } from '../controllers/userController.js'
import { authenticated, isAdmin } from '../middlewares/auth.js'
import uploadAvatar from '../middlewares/upload.js'

const router = Router()

router.get('/:username', authenticated, getUser)
router.get('/:username/followers', authenticated, getFollowers)
router.get('/:username/following', authenticated, getFollowing)

router.post('/:username/follow', authenticated, followUser)

router.patch('/me', authenticated, updateMe)
router.patch('/me/password', authenticated, updatePassword)
router.patch('/:id/promote', authenticated, isAdmin, promoteUser)

router.delete('/me', authenticated, deleteMe)
router.delete('/:id', authenticated, isAdmin, deleteUser)

router.patch('/me/avatar', authenticated, uploadAvatar, updateAvatar)
router.delete('/me/avatar', authenticated, removeAvatar)

export default router