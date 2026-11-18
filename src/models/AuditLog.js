import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    method: DataTypes.STRING(10),
    path: DataTypes.STRING,
    statusCode: DataTypes.INTEGER,
    ip: DataTypes.STRING(64),
    userAgent: DataTypes.STRING(300),
    requestId: DataTypes.STRING(64),
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    updatedAt: false, 
    indexes: [
        { fields: ['createdAt'] },
        { fields: ['userId', 'createdAt'] },
        { fields: ['action', 'createdAt'] }
    ]
})

export default AuditLog