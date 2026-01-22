import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@naratani.com",
    to,
    subject,
    html,
  })
}

export async function sendOTPEmail({
  email,
  otp,
  type,
}: {
  email: string
  otp: string
  type: "sign-in" | "email-verification" | "forget-password"
}) {
  const subjects: Record<typeof type, string> = {
    "email-verification": "Verifikasi Email Anda - Naratani",
    "forget-password": "Reset Kata Sandi - Naratani",
    "sign-in": "Masuk ke Naratani",
  }

  const templates: Record<typeof type, string> = {
    "email-verification": `
      <h2>Verifikasi Email Anda</h2>
      <p>Terima kasih telah mendaftar di Naratani. Silakan gunakan kode verifikasi berikut untuk menyelesaikan pendaftaran Anda:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4F46E5;">${otp}</p>
      <p>Kode ini akan kadaluarsa dalam 5 menit.</p>
      <p>Jika Anda tidak meminta ini, silakan abaikan email ini.</p>
    `,
    "forget-password": `
      <h2>Reset Kata Sandi</h2>
      <p>Kami menerima permintaan untuk mereset kata sandi Anda. Gunakan kode berikut untuk mengatur kata sandi baru:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4F46E5;">${otp}</p>
      <p>Kode ini akan kadaluarsa dalam 5 menit.</p>
      <p>Jika Anda tidak meminta ini, silakan abaikan email ini.</p>
    `,
    "sign-in": `
      <h2>Masuk ke Naratani</h2>
      <p>Gunakan kode berikut untuk masuk ke akun Anda:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4F46E5;">${otp}</p>
      <p>Kode ini akan kadaluarsa dalam 5 menit.</p>
      <p>Jika Anda tidak meminta ini, silakan abaikan email ini.</p>
    `,
  }

  await sendEmail({
    to: email,
    subject: subjects[type],
    html: templates[type],
  })
}
