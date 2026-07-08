import { Router } from "express";
import { createResenha, updateResenha, deleteResenha, getBookResenhas, getUserResenhas } from "../controllers/resenhaController.js";

const router = Router()

router.post('/:bookId', createResenha)
router.put('/:id', updateResenha)
router.get('/book/:bookId', getBookResenhas)
router.get('/user/:userId', getUserResenhas)
router.delete('/:id', deleteResenha)

export default router