// backend/routes/celebrationRoutes.js
const express = require('express');
const router = express.Router();
const CelebrationTemplate = require('../models/CelebrationTemplate');
const { buildBirthdayEmail, buildAnniversaryEmail } = require('../utils/celebrationEmailTemplate');
const Staff = require('../models/Staff');

const defaultTemplates = {
  birthday:
    "May this special day bring you lots of happiness, wonderful moments and endless smiles!😊✨\n\n" +
    "We hope the year ahead brings you continued success 🚀, personal growth, and many more reasons to celebrate.\n\n" +
    "Keep smiling, keep shining , have a fantastic birthday and a wonderful year ahead!",

  anniversary:
    "Over the past year(s), you have been a part of our journey 🚀, contributed to our goals, taken on challenges, and added your own value to the team 🌟. And today is a great time to celebrate you and your journey with us! 😉🎉\n\n" +
    "Here’s to the experiences, achievements, lessons, and memories so far, and to many more exciting milestones ahead!✨\n\n" +
    "Keep growing, keep achieving, and most importantly, keep enjoying the journey!"
};

// Initialize defaults, and keep "defaultMessageBody" in sync with the code above
const initializeTemplates = async () => {
  for (const type of ['birthday', 'anniversary']) {
    const existing = await CelebrationTemplate.findOne({ type });
    if (!existing) {
      await CelebrationTemplate.create({
        type,
        messageBody: defaultTemplates[type],
        defaultMessageBody: defaultTemplates[type]
      });
    } else if (existing.defaultMessageBody !== defaultTemplates[type]) {
      // Update only the default (admin's saved messageBody is NOT touched)
      existing.defaultMessageBody = defaultTemplates[type];
      await existing.save();
    }
  }
};
initializeTemplates();

// GET: Fetch both templates
router.get('/', async (req, res) => {
  try {
    const templates = await CelebrationTemplate.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Error fetching templates" });
  }
});

// PUT: Update a template's message body
router.put('/:type', async (req, res) => {
  try {
    const { messageBody } = req.body;
    const template = await CelebrationTemplate.findOneAndUpdate(
      { type: req.params.type },
      { messageBody },
      { new: true }
    );
    res.json({ message: "Message saved successfully", template });
  } catch (error) {
    res.status(500).json({ error: "Error updating template" });
  }
});

// POST: Reset to default
router.post('/reset/:type', async (req, res) => {
  try {
    const template = await CelebrationTemplate.findOne({ type: req.params.type });
    if (!template) return res.status(404).json({ error: "Template not found" });

    template.messageBody = template.defaultMessageBody;
    await template.save();
    res.json({ message: "Reset to default successfully", template });
  } catch (error) {
    res.status(500).json({ error: "Error resetting template" });
  }
});

// POST: Render preview HTML (same template used for real emails)
router.post('/preview', (req, res) => {
  try {
    const { type, messageBody = '' } = req.body;

    const html =
      type === 'anniversary'
        ? buildAnniversaryEmail({ name: 'Employee Name', message: messageBody, yearsCompleted: 3 })
        : buildBirthdayEmail({ name: 'Employee Name', message: messageBody });

    res.json({ html });
  } catch (error) {
    res.status(500).json({ error: "Error generating preview" });
  }
});

// GET: Who will receive wishes today + next N days (same logic as cron)
router.get('/recipients', async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 7, 30);
    const staff = await Staff.find({ status: { $ne: 'Inactive employee' } });

    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    today.setHours(0, 0, 0, 0);

    const result = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const y = d.getFullYear();

      const birthdays = [];
      const anniversaries = [];

      staff.forEach((s) => {
        if (s.dob) {
          const b = new Date(s.dob);
          if (b.getUTCMonth() + 1 === m && b.getUTCDate() === day) {
            birthdays.push({ name: s.name, email: s.email });
          }
        }
        if (s.onboardingDate) {
          const o = new Date(s.onboardingDate);
          const years = y - o.getUTCFullYear();
          if (o.getUTCMonth() + 1 === m && o.getUTCDate() === day && years > 0) {
            anniversaries.push({ name: s.name, email: s.email, years });
          }
        }
      });

      if (birthdays.length || anniversaries.length) {
        result.push({
          date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          daysFromNow: i,
          birthdays,
          anniversaries,
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Error fetching recipients' });
  }
});


module.exports = router;