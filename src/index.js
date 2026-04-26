import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import sequelize  from './config/database.js'
import authRoutes from './routes/authRoutes.js'
import UserRoutes from './routes/userRoutes.js'
import './models/Follow.js'
import './models/User.js'
import { authenticated } from './middlewares/auth.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/users', UserRoutes)
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