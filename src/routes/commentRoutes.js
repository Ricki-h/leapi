import { Router } from 'express';
import { createComment, getCommentsByPostId } from '../controllers/commentController.js';

const router = Router();

router.post('/', createComment);
router.get('/:postId', getCommentsByPostId);

export default router;
