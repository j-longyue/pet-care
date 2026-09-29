const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendPasswordResetEmail = async (to, resetLink) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Pet Care Suport" <no-reply@petcaresuport.com>',
    to,
    subject: 'Redefinição de senha',
    html: `
      <p>Você solicitou a redefinição da sua senha.</p>
      <p>Clique no link abaixo para criar uma nova senha. Este link expira em 1 hora:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Se você não solicitou isso, apenas ignore este e-mail — sua senha continua a mesma.</p>
    `,
  });
};

const sendWelcomeEmail = async (to, name) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Pet Care Suport" <no-reply@petcaresuport.com>',
    to,
    subject: 'Bem-vindo(a)!',
    html: `
      <p>Olá, ${name}!</p>
      <p>Sua conta foi criada com sucesso. Seja bem-vindo(a) à plataforma!</p>
      <p>Se você não criou essa conta, entre em contato com o suporte.</p>
    `,
  });
};

module.exports = { sendPasswordResetEmail, sendWelcomeEmail }; 