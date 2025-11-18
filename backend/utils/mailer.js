const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


function sendLeaveStatusEmail(to, subject, body) {
  const mailOptions = {
    from: process.env.BREVO_USER,
    to,
    subject,
    text: body,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendLeaveStatusEmail };
