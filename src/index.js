import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import sequelize from './config/database.js'
import logger from './config/logger.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import bookRoutes from './routes/bookRoutes.js'
import listRoutes from './routes/listRoutes.js'
import ratingRoutes from './routes/ratingRoutes.js'
import resenhaRoutes from './routes/resenhaRoutes.js'
import postRoutes from './routes/postRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import './models/User.js'
import './models/Follow.js'
import './models/Author.js'
import './models/Genre.js'
import './models/Book.js'
import './models/BookList.js'
import './models/BookListItem.js'
import './models/Rating.js'
import './models/Resenha.js'
import './models/Post.js'
import './models/Like.js'
import './models/AuditLog.js'
import auditMutations from './middlewares/auditMutations.js'
import requestLogger from './middlewares/requestLogger.js'

const app = express()

app.set('trust proxy', 1)

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONT_URL,
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

app.use(requestLogger)
app.use(express.json())
app.use(cookieParser())
app.use(auditMutations)

app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/books', bookRoutes)
app.use('/lists', listRoutes)
app.use('/ratings', ratingRoutes)
app.use('/resenhas', resenhaRoutes)
app.use('/posts', postRoutes)
app.use('/admin/audit-logs', auditRoutes)
app.get('/', (req, res) => {
    res.json({ message: 'API funcionando' })
})

// 404 para rotas inexistentes
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' })
})

// Handler global de erros (precisa dos 4 parâmetros e ficar por último)
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON inválido.' })
    }
    req.log.error({ err }, 'Erro não tratado')
    return res.status(500).json({ error: 'Erro interno do servidor.' })
})

process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandledRejection')
})
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException')
    process.exit(1)
})

sequelize.authenticate()
  .then(() => {
    logger.info('Banco conectado!')
    return sequelize.sync()
  })
  .then(() => {
    app.listen(process.env.PORT, () => {
      logger.info(`Servidor na porta ${process.env.PORT}`)
    })
  })
  .catch(err => {
    logger.fatal({ err }, 'Erro ao iniciar o servidor')
    process.exit(1)
  })