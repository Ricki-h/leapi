import { Router } from "express";
import { getBook, searchBooks } from "../controllers/bookController.js";

const router = Router()

router.get('/search', searchBooks)
router.get('/:id', getBook)

export default router