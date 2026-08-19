'use strict';

const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: env.smtp.auth,
});

async function send2FACode(to, code) {
  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'رمز التحقق — لوحة تحكم NKhat',
    text: `رمز التحقق الخاص بك: ${code}\n\nصالح لمدة 5 دقائق فقط.\n\nإذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.`,
    html: `
      <div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.6">
        <h2>رمز التحقق</h2>
        <p>رمز الدخول إلى لوحة التحكم:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
        <p style="color:#666">صالح لمدة <strong>5 دقائق</strong> فقط.</p>
        <p style="color:#999;font-size:13px">إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</p>
      </div>
    `,
  });
}

module.exports = { transporter, send2FACode };
