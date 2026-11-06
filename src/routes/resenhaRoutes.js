import { Router } from "express";
import { createResenha, updateResenha, deleteResenha, getBookResenhas, getUserResenhas } from "../controllers/resenhaController.js";
import { authenticated } from "../middlewares/auth.js"; // ajuste nome e caminho

const router = Router()

router.post('/:bookId', authenticated, createResenha)
router.put('/:id', authenticated, updateResenha)
router.get('/book/:bookId', authenticated, getBookResenhas)
router.get('/user/:userId', authenticated, getUserResenhas)
router.delete('/:id', authenticated, deleteResenha)

export default router