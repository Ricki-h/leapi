import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^[a-z0-9_.]+/i,
      len: [3-30]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
        oldEnough(value) {
            const birth = new Date(value)
            const today = new Date()
            const initAge = today.getFullYear() - birth.getFullYear()
            const monthDiff = today.getMonth() - birth.getMonth()

            const age = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())
            ? initAge - 1
            : initAge

            if (age < 12) {
                throw new Error('Você tem que ter no mínimo 12 anos para criar conta na plataforma.')
            }
        }
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'https://res.cloudinary.com/dogfe2npo/image/upload/v1777050334/deafultAvatar_1_yl8fl5.png'
  },
  avatarCloudinaryId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerifyToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
})

export default User