import { Router } from 'express'
import { getUser, updateMe, updatePassword, promoteUser, deleteUser, deleteMe, followUser, getFollowers, getFollowing, updateAvatar, removeAvatar } from '../controllers/userController.js'
import { authenticated, isAdmin } from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'

const router = Router()

router.get('/:username', getUser)
router.get('/:username/followers', getFollowers)
router.get('/:username/following', getFollowing)

router.post('/:username/follow', authenticated, followUser)

router.patch('/me', authenticated, updateMe)
router.patch('/me/password', authenticated, updatePassword)
router.patch('/:id/promote', authenticated, isAdmin, promoteUser)

router.delete('/me', authenticated, deleteMe)
router.delete('/:id', authenticated, isAdmin, deleteUser)

router.patch('/me/avatar', authenticated, upload.single('avatar'), updateAvatar)
router.delete('/me/avatar', authenticated, removeAvatar)

export default router