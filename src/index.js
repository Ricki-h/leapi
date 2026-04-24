import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import sequelize  from './config/database.js'

const app = express()

app.use(cors())
app.use(express.json())

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