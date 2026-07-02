import { Router } from 'express'
import { getLists, createList, updateList, deleteList, addBookToList, removeBookFromList, getMyLists } from '../controllers/listController.js'
import { authenticated } from '../middlewares/auth.js'

const router = Router()

router.get('/me', authenticated, getMyLists)
router.get('/user/:userId', getLists)
router.post('/', authenticated, createList)
router.patch('/:id', authenticated, updateList)
router.delete('/:id', authenticated, deleteList)
router.post('/:id/books', authenticated, addBookToList)
router.delete('/:id/books/:bookId', authenticated, removeBookFromList)

export default router