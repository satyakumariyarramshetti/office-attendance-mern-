require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSend() {
  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('SMTP Config Verified!');

    const info = await transporter.sendMail({
      from: `"Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send test email to yourself
      subject: 'Test Email',
      text: 'Testing nodemailer setup.',
    });

    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('SMTP test failed:', error);
  }
}

testSend();
