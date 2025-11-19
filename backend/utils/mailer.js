// mailer.js - Using Brevo Transactional Email API

const Brevo = require("@getbrevo/brevo");

// Create Brevo API Instance
const apiInstance = new Brevo.TransactionalEmailsApi();

// Set API Key from .env
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/**
 * Send Leave Status Email
 * @param {string} to - Recipient's email
 * @param {string} subject - Email subject
 * @param {string} text - Email body
 */
async function sendLeaveStatusEmail(to, subject, text) {
  try {
    const emailData = {
      sender: {
        name: "tech.praxsol",
        email: process.env.EMAIL_USER, // must be a verified sender in Brevo
      },
      to: [{ email: to }],
      subject: subject,
      textContent: text,
    };

    // Send email
    await apiInstance.sendTransacEmail(emailData);

    console.log("📩 Email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("❌ Brevo Email Send Error:", error.message);
    throw error;
  }
}

module.exports = { sendLeaveStatusEmail };
