import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import sequelize  from './config/database.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import bookRoutes from './routes/bookRoutes.js'
import listRoutes from './routes/listRoutes.js'
import ratingRoutes from './routes/ratingRoutes.js'
import resenhaRoutes from './routes/resenhaRoutes.js'
import postRoutes from './routes/postRoutes.js'
import './models/User.js'
import './models/Follow.js'
import './models/User.js'
import './models/Author.js'
import './models/Genre.js'
import './models/Book.js'
import './models/BookList.js'
import './models/BookListItem.js'
import './models/Rating.js'
import './models/Resenha.js'
import './models/Follow.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/books', bookRoutes)
app.use('/lists', listRoutes)
app.use('/ratings', ratingRoutes)
app.use('/resenhas', resenhaRoutes)
app.use('/posts', postRoutes)
app.get('/', (req, res) => {
    res.json({ message: 'API funcionando' })
})


sequelize.authenticate()
  .then(() => {
    console.log('Banco conectado!')
    return sequelize.sync()
  })
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Servidor na porta ${process.env.PORT}`)
    })
  })
  .catch(err => console.error('Erro:', err))