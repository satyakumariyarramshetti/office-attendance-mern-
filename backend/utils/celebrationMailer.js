// backend/utils/celebrationMailer.js
const sendCelebrationMail = async (to, subject, html, text) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.CELEBRATION_BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.CELEB_FROM_NAME || 'Praxsol Engineering',
        email: process.env.CELEB_SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
  }
};

module.exports = { sendCelebrationMail };