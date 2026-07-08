import { Router } from "express";
import { createPost, deletePost, getPost, getUserPosts, likePost, unlikePost } from "../controllers/postController.js";

const router = Router()

router.post('/', createPost)
router.get('/:id', getPost)
router.get('/user/:userId', getUserPosts)
router.get('/user/:userId/all', getUserPostsAndReplies)
router.delete('/:id', deletePost)
router.post('/:id/like', likePost)
router.delete('/:id/like', unlikePost)

export default router