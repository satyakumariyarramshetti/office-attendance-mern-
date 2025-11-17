const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tech.praxsol@gmail.com',
    pass: 'eeqohmopiahtvkao' // use app password for better security if 2FA enabled
  }
});

function sendLeaveStatusEmail(to, subject, body) {
  const mailOptions = {
    from: 'tech.praxsol@gmail.com',
    to,
    subject,
    text: body
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendLeaveStatusEmail };
