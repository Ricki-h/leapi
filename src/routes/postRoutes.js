import { Router } from 'express';
import { createPost, getAllPosts, getPostById } from '../controllers/postController.js';

const router = Router();

router.post('/criar', createPost);
router.get('/pegar', getAllPosts);
router.get('/:id', getPostById);

export default router;
