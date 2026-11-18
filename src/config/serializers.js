import pino from 'pino'

// Campos de erros do Sequelize/axios que podem conter SQL, valores digitados,
// instâncias de model (com hash de senha) ou headers
const SENSITIVE_ERR_KEYS = [
    'sql', 'parameters', 'parent', 'original', 'fields',
    'errors', 'instance', 'config', 'request', 'response', 'headers'
]

export const errSerializer = (err) => {
    const s = pino.stdSerializers.err(err)
    if (!s || typeof s !== 'object') return s

    // Mantém só o que ajuda a depurar, sem o valor digitado
    if (Array.isArray(s.errors)) {
        s.validation = s.errors.map(e => ({ path: e.path, type: e.type, message: e.message }))
    }

    for (const key of SENSITIVE_ERR_KEYS) delete s[key]
    return s
}

export const reqSerializer = (req) => ({ id: req.id, method: req.method, url: req.url })
export const resSerializer = (res) => ({ statusCode: res.statusCode })