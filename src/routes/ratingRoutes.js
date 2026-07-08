import { Router } from "express";
import { createOrUpdateRating, deleteRating, getBookRatings } from "../controllers/ratingController";

const router = Router()

router.get('/:bookId', getBookRatings)
router.put('/rate', createOrUpdateRating)
router.delete('/:bookId')