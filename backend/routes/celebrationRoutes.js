// backend/routes/celebrationRoutes.js
const express = require('express');
const router = express.Router();
const CelebrationTemplate = require('../models/CelebrationTemplate');

const defaultTemplates = {
  birthday: "May this special day bring you lots of happiness, wonderful moments. We hope the year ahead brings you continued success, personal growth, and many reasons to celebrate.\n\nKeep smiling, keep shining, Have a fantastic birthday and a wonderful year ahead!",
  
  anniversary: "Over the past year(s), you have been a part of our journey, contributed to our goals, taken on challenges, and added your own value to the team. And today is a great time to celebrate you and your journey with us! 😉\n\nHere’s to the experiences, achievements, lessons, and memories so far and to many more exciting milestones ahead.\n\nKeep growing, keep achieving, and most importantly, keep enjoying the journey!"
};

// Initialize defaults if they don't exist
const initializeTemplates = async () => {
  for (const type of ['birthday', 'anniversary']) {
    const existing = await CelebrationTemplate.findOne({ type });
    if (!existing) {
      await CelebrationTemplate.create({
        type,
        messageBody: defaultTemplates[type],
        defaultMessageBody: defaultTemplates[type]
      });
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

module.exports = router;