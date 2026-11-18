import Resenha from '../models/Resenha.js'
import Book from '../models/Book.js'
import User from '../models/User.js'
import { audit } from '../services/audit.js'

const NOTA_MIN = 1
const NOTA_MAX = 5
const FIELDS = ['body', 'writing', 'plot', 'characters', 'pacing', 'emotionalImpact', 'worldbuilding']
const NOTAS = ['writing', 'plot', 'characters', 'pacing', 'emotionalImpact', 'worldbuilding']
const NOTAS_OBRIGATORIAS = ['writing', 'plot', 'characters', 'pacing', 'emotionalImpact']

const pick = (obj, keys) =>
    Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]))

// Média dos critérios preenchidos (worldbuilding só entra se existir)
function calcularScore(dados) {
    const valores = NOTAS
        .map(k => dados[k])
        .filter(v => v !== undefined && v !== null)
        .map(Number)

    if (valores.length === 0) return null

    const media = valores.reduce((soma, v) => soma + v, 0) / valores.length
    return Number(media.toFixed(1))
}

// Retorna uma mensagem de erro, ou null se estiver tudo certo
function validar(dados, { parcial = false } = {}) {
    if (!parcial) {
        if (!dados.body || String(dados.body).trim() === '') {
            return 'Escreva o texto da resenha.'
        }
        if (NOTAS_OBRIGATORIAS.some(k => dados[k] === undefined || dados[k] === null)) {
            return 'Preencha todas as notas obrigatórias.'
        }
    }

    for (const k of NOTAS) {
        if (dados[k] === undefined || dados[k] === null) continue
        const n = Number(dados[k])
        if (!Number.isInteger(n) || n < NOTA_MIN || n > NOTA_MAX) {
            return `Cada nota deve ser um número inteiro de ${NOTA_MIN} a ${NOTA_MAX}.`
        }
    }

    return null
}

export const createResenha = async (req, res) => {
    try {
        const { bookId } = req.params
        const dados = pick(req.body, FIELDS)

        const erro = validar(dados)
        if (erro) {
            return res.status(400).json({ error: erro })
        }

        const book = await Book.findByPk(bookId)
        if (!book) {
            return res.status(404).json({ error: 'Livro não encontrado.' })
        }

        const existing = await Resenha.findOne({
            where: { userId: req.user.id, bookId }
        })
        if (existing) {
            return res.status(400).json({ error: 'Você já escreveu uma resenha deste livro.' })
        }

        const resenha = await Resenha.create({
            ...dados,
            body: String(dados.body).trim(),
            userId: req.user.id,
            bookId
        })

        return res.status(201).json(resenha)
    } catch (err) {
        req.log.error({ err }, 'Erro em createResenha')
        return res.status(500).json({ error: 'Erro ao criar uma resenha.' })
    }
}

export const updateResenha = async (req, res) => {
    try {
        const resenha = await Resenha.findOne({
            where: { id: req.params.id, userId: req.user.id }
        })
        if (!resenha) {
            return res.status(404).json({ error: 'Resenha não encontrada.' })
        }

        const dados = pick(req.body, FIELDS)

        const erro = validar(dados, { parcial: true })
        if (erro) {
            return res.status(400).json({ error: erro })
        }

        resenha.set(dados)
        await resenha.save()

        return res.json(resenha)
    } catch (err) {
        req.log.error({ err }, 'Erro em updateResenha')
        return res.status(500).json({ error: 'Erro ao atualizar resenha.' })
    }
}

export const deleteResenha = async (req, res) => {
    try {
        const resenha = await Resenha.findOne({
            where: { id: req.params.id }
        })

        if (!resenha) {
            return res.status(404).json({ error: 'Resenha não encontrada.' })
        }

        if (resenha.userId !== req.user.id && req.user.role !== 'admin') {
            req.log.warn({ event: 'resenha.delete_forbidden', resenhaId: resenha.id }, 'Tentativa de apagar resenha de outro usuário')
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        const byAdmin = resenha.userId !== req.user.id
        const info = { resenhaId: resenha.id, ownerId: resenha.userId, bookId: resenha.bookId }

        await resenha.destroy()

        if (byAdmin) {
            audit(req, 'resenha.deleted_by_admin', info)
        }

        return res.json({ message: 'Resenha deletada.' })
    } catch (err) {
        req.log.error({ err }, 'Erro em deleteResenha')
        return res.status(500).json({ error: 'Erro ao deletar resenha.' })
    }
}

export const getBookResenhas = async (req, res) => {
    try {
        const resenhas = await Resenha.findAll({
            where: { bookId: req.params.bookId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'avatarUrl']
            }],
            order: [['createdAt', 'DESC']]
        })

        const comNota = resenhas.filter(r => r.score !== null && r.score !== undefined)
        const average = comNota.length
            ? (comNota.reduce((sum, r) => sum + parseFloat(r.score), 0) / comNota.length).toFixed(1)
            : null

        return res.json({ average, total: resenhas.length, resenhas })
    } catch (err) {
        req.log.error({ err }, 'Erro em getBookResenhas')
        return res.status(500).json({ error: 'Erro ao carregar resenhas do livro.' })
    }
}

export const getUserResenhas = async (req, res) => {
    try {
        const resenhas = await Resenha.findAll({
            where: { userId: req.params.userId },
            include: [{
                model: Book,
                as: 'book',
                attributes: ['id', 'title', 'coverUrl']
            }],
            order: [['createdAt', 'DESC']]
        })

        return res.json(resenhas)
    } catch (err) {
        req.log.error({ err }, 'Erro em getUserResenhas')
        return res.status(500).json({ error: 'Erro ao carregar resenhas do usuário.' })
    }
}

export const getResenhaById = async (req, res) => {
    try {
        const resenha = await Resenha.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'username', 'avatarUrl']
                },
                {
                    model: Book,
                    as: 'book',
                    attributes: ['id', 'title', 'coverUrl']
                }
            ]
        })

        if (!resenha) {
            return res.status(404).json({ error: 'Resenha não encontrada.' })
        }

        return res.json(resenha)
    } catch (err) {
        console.error('getResenhaById:', err)
        return res.status(500).json({ error: 'Erro ao carregar resenha.' })
    }
}