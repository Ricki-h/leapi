import { Router } from "express";
import { createRating, updateRating, deleteRating, getBookRatings } from "../controllers/ratingController.js";
import { authenticated } from "../middlewares/auth.js";


const router = Router()

router.get('/:bookId', authenticated, getBookRatings)
router.post('/rate/:bookId', authenticated, createRating)
router.put('/edit/:bookId', authenticated, updateRating)
router.delete('/:bookId', authenticated, deleteRating)

export default router