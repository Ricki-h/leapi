import { Router } from "express";
import { createPost, deletePost, getPost, getUserPosts, likePost, unlikePost, getUserPostsAndReplies, getFeed } from "../controllers/postController.js";
import { authenticated } from "../middlewares/auth.js";


const router = Router()

router.post('/', authenticated, createPost)
router.get('/feed', authenticated, getFeed)
router.get('/:id', authenticated, getPost)
router.get('/user/:userId', authenticated, getUserPosts)
router.get('/user/:userId/all', authenticated, getUserPostsAndReplies)
router.delete('/:id', authenticated, deletePost)
router.post('/:id/like', authenticated, likePost)
router.delete('/:id/like', authenticated, unlikePost)

export default router