import { Router } from "express";
import { createResenha, updateResenha, deleteResenha, getBookResenhas, getUserResenhas } from "../controllers/resenhaController";

const router = Router()

router.post('/:bookId', createResenha)
router.put('/:id', updateResenha)
router.get('/book/:bookId')
router.get('/user/:userId')
router.delete('/:id')