import multer from 'multer'

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (req, file, cb) => {
        if (!AVATAR_TYPES.includes(file.mimetype)) {
            return cb(new Error('INVALID_FILE_TYPE'))
        }
        cb(null, true)
    }
}).single('avatar')

// transforma os erros do multer em respostas amigáveis
const uploadAvatar = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'A imagem deve ter no máximo 2 MB.' })
        }
        if (err?.message === 'INVALID_FILE_TYPE') {
            return res.status(400).json({ error: 'Formato inválido. Use JPG, PNG ou WebP.' })
        }
        if (err) {
            return res.status(400).json({ error: 'Falha ao processar o arquivo.' })
        }
        next()
    })
}

export default uploadAvatar