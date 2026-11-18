import pino from 'pino'
import { errSerializer } from './serializers.js'

const isProd = process.env.NODE_ENV === 'production'
const writeFiles = process.env.LOG_TO_FILE === 'true' // só em VPS (disco persistente)

let transport
if (!isProd) {
    transport = { target: 'pino-pretty', options: { colorize: true } }
} else if (writeFiles) {
    transport = {
        targets: [
            { target: 'pino/file', options: { destination: 1 } }, // stdout
            {
                target: 'pino-roll',
                // sem "limit": nenhum arquivo é apagado automaticamente
                options: { file: './logs/app', extension: '.log', frequency: 'daily', mkdir: true }
            }
        ]
    }
}
// produção sem LOG_TO_FILE: JSON no stdout, que a plataforma coleta

const logger = pino({
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    redact: {
        paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword'
        ],
        censor: '[REDACTED]'
    },
    serializers: { err: errSerializer },
    ...(transport && { transport })
})

export default logger