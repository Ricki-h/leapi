import { Router } from "express";
import { createOrUpdateRating, deleteRating, getBookRatings } from "../controllers/ratingController.js";
import { authenticated } from "../middlewares/auth.js";


const router = Router()

router.get('/:bookId', authenticated, getBookRatings)
router.put('/rate/:bookId', authenticated, createOrUpdateRating)
router.delete('/:bookId', authenticated, deleteRating)

export default router