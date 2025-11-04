const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFMerger = require('pdf-merger-js');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer(); // Memory storage by default
// ADD THIS TEST ROUTE
router.get('/test-connection', (req, res) => {
  res.status(200).send('Connection to payslipRoutes.js is successful!');
});
const payslipDir = path.join(__dirname, '../payslips'); // folder where payslips are saved

// -------------------- SEND SINGLE PAYSLIP BY EMAIL --------------------
router.post('/send-payslip-email', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).send('Missing PDF file');
    }
    const pdfBuffer = req.file.buffer;
    const employeeEmail = req.body.employeeEmail;

    if (!employeeEmail) {
      return res.status(400).send('Missing employee email');
    }

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();

    const mailOptions = {
      from: '"Admin - Praxsol Engineering" <payslip1praxsol@gmail.com>',
      to: employeeEmail,
      subject: 'Payslip Attachment from Praxsol Engineering Private Limited',
      html: `
        <p>Dear Employee,</p>
        <p>Please find your payslip attached to this email.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <br>
        <p><strong>Praxsol Engineering Private Limited</strong></p>
        <p>
          Mobile:+91 910 001 3128<br>
          Email: payslip1praxsol@gmail.com
        </p>
        <hr>
        <p>
          <strong>Office:</strong><br>
          Praxsol Engineering Private Limited,<br>
          CIN: U74200AP2019PTC113723<br>
          GSTIN: 37AAKCP9516F2Z2<br>
          4th Floor, Isnar Satyasri Complex,<br>
          Dwarakanagar, Visakhapatnam, Andhra Pradesh,<br>
          India 530 016<br>
          Web: www.praxsol.in<br>
          E mail: info@praxsol.in<br>
          Office: +91 910 001 3128<br>
          WhatsApp: +91 910 001 3228
        </p>
        <hr>
        <p>
          <small>
            <strong>Disclaimer:</strong> This email information if any enclosure(s) or attachment(s) included is confidential and may be proprietary and may be sensitive. This message is intended solely for the addressee. If you have received this message in error, please inform us immediately and delete its contents. Any reuse, distribution, disclosure, printing or copying email content is whole or in part is strictly prohibited. Sender shall not be liable for the improper or incomplete transmission of the information contained in this email including attachments for any delay in its receipt or damage to your system. Since the sender does not guarantee that the security of this communication has been maintained or that this communication is free of viruses or interference’s, sender accepts no liability for any damage caused by any virus transmitted by this email. Anyone communicating with sender by email accepts the risks involved and their consequences.
          </small>
        </p>
      `,
      attachments: [
        {
          filename: 'payslip.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send('Payslip email sent successfully');
  } catch (error) {
    console.error('Error sending payslip email:', error);
    const message = error && error.message ? error.message : 'Server error sending payslip email';
    res.status(500).send(`Server error sending payslip email: ${message}`);
  }
});

// -------------------- MERGE ALL PAYSLIPS --------------------
router.get('/merge', async (req, res) => {
  try {
    const merger = new PDFMerger();

    // check folder exists
    if (!fs.existsSync(payslipDir)) {
      return res.status(400).json({ message: 'Payslip folder not found' });
    }

    // get all PDF files
    const files = fs.readdirSync(payslipDir).filter(file => file.endsWith('.pdf'));

    if (files.length === 0) {
      return res.status(400).json({ message: 'No payslips found to merge.' });
    }

    for (const file of files) {
      await merger.add(path.join(payslipDir, file));
    }

    const mergedFile = path.join(payslipDir, 'all_payslips.pdf');
    await merger.save(mergedFile);

    console.log('✅ All payslips merged into:', mergedFile);

    // send the merged PDF as a download
    res.download(mergedFile);
  } catch (err) {
    console.error('Error merging payslips:', err);
    res.status(500).json({ message: 'Failed to merge payslips' });
  }
});

module.exports = router;
