import pinoHttp from 'pino-http'
import { randomUUID } from 'node:crypto'
import logger from '../config/logger.js'
import { errSerializer, reqSerializer, resSerializer } from '../config/serializers.js'

// Só aceita IDs com formato esperado (evita header gigante ou texto injetado)
const VALID_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/

export default pinoHttp({
    logger,

    genReqId: (req, res) => {
        const incoming = req.headers['x-request-id']
        const id = typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming)
            ? incoming
            : randomUUID()
        res.setHeader('X-Request-Id', id)
        return id
    },

    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
    },

    customProps: (req) => ({ userId: req.user?.id }),

    // O err precisa estar aqui também: o pino-http cria um logger filho
    // e poderia usar o serializer padrão no lugar do nosso
    serializers: {
        err: errSerializer,
        req: reqSerializer,
        res: resSerializer
    }
})