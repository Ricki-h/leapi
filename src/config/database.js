import { Sequelize } from 'sequelize'
import 'dotenv/config'

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgress',
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false}
    },
    logging: false
})
// teste
export default sequelize

