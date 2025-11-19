const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,                // IMPORTANT: works better on Render
  secure: false,            // must be false for port 587
  auth: {
    user: process.env.EMAIL_USER,  // your Gmail
    pass: process.env.EMAIL_PASS,  // your App Password
  },
  tls: {
    rejectUnauthorized: false,   // prevent SSL errors
  },
});

// Test SMTP connection (optional)
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

function sendLeaveStatusEmail(to, subject, body) {
  const mailOptions = {
    from: `"Praxsol Engineering" <${process.env.EMAIL_USER}>`,  
    to,
    subject,
    text: body,
  };

  return transporter
    .sendMail(mailOptions)
    .then(info => {
      console.log("Email sent:", info.response);
      return info;
    })
    .catch(err => {
      console.error("Email sending failed:", err);
      throw err;
    });
}

module.exports = { sendLeaveStatusEmail };
