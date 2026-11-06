import Resenha from '../models/Resenha.js'
import Book from '../models/Book.js'
import User from '../models/User.js'

const NOTA_MAX = 10
const FIELDS = ['body', 'score', 'writing', 'plot', 'characters', 'pacing', 'emotionalImpact', 'worldbuilding']
const NOTAS = ['score', 'writing', 'plot', 'characters', 'pacing', 'emotionalImpact', 'worldbuilding']
const NOTAS_OBRIGATORIAS = ['score', 'writing', 'plot', 'characters', 'pacing', 'emotionalImpact']

const pick = (obj, keys) =>
    Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]))

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
        if (isNaN(n) || n < 0 || n > NOTA_MAX) {
            return `A nota deve ser um número entre 0 e ${NOTA_MAX}.`
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
        console.error('createResenha:', err)
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
        console.error('updateResenha:', err)
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
            return res.status(403).json({ error: 'Sem permissão.' })
        }

        await resenha.destroy()

        return res.json({ message: 'Resenha deletada.' })
    } catch (err) {
        console.error('deleteResenha:', err)
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
        console.error('getBookResenhas:', err)
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
        console.error('getUserResenhas:', err)
        return res.status(500).json({ error: 'Erro ao carregar resenhas do usuário.' })
    }
}