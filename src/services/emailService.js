import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
})

export const sendVerificationEmail = async (email, token) => {
  const link = `${process.env.FRONT_URL}/verificar-email?token=${token}`

  await transporter.sendMail({
    from: `Leafy <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Confirme seu email — Leafy',
    html: `
      <h2>Bem vindo ao Leafy!</h2>
      <p>Clique no link abaixo para confirmar seu email:</p>
      <a href="${link}">${link}</a>
      <p>O link expira em 24 horas.</p>
    `
  })
}

export const sendResetPasswordEmail = async (email, token) => {
  const link = `${process.env.FRONT_URL}/resetar-senha?token=${token}`

  await transporter.sendMail({
    from: `Leafy <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Recuperação de senha — Leafy',
    html: `
      <h2>Recuperação de senha</h2>
      <p>Clique no link abaixo para criar uma nova senha:</p>
      <a href="${link}">${link}</a>
      <p>O link expira em 1 hora.</p>
      <p>Se você não solicitou isso, ignore este email.</p>
    `
  })
}