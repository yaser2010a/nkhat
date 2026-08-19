'use strict';

const { Resend } = require('resend');
const env = require('./env');

// استخدام مفتاح الـ API الموجود في المتغيرات
const resend = new Resend(env.smtp.pass); 
// ملاحظة: env.smtp.pass هو نفسه مفتاح الـ re_... اللي حطيته في الـ Render

async function send2FACode(to, code) {
  try {
    const data = await resend.emails.send({
      from: 'NKhat Shamya <onboarding@resend.dev>', // أو دومينك لو وثقته مستقبلاً
      to: [to],
      subject: 'رمز التحقق — لوحة تحكم NKhat',
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
    
    return data;
  } catch (error) {
    console.error('Resend Error:', error);
    throw error;
  }
}

module.exports = { send2FACode };