import { Sequelize } from 'sequelize'
import 'dotenv/config'
console.log("Variável carregada:", process.env.DATABASE_URL);
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    
    dialect: 'postgress',
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false}
    },
    logging: false
})
// teste
export default sequelize

console.log("Minha URL do banco:", process.env.DATABASE_URL); // Adicione isso
