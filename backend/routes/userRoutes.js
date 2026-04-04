const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 1. అన్ని యూజర్లను పొందడానికి
router.get('/all', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. కొత్త యూజర్‌ని యాడ్ చేయడానికి (కేవలం 3 ఫీల్డ్స్)
router.post('/add', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const newUser = new User({ username, email, password, isLoggedIn: false });
    await newUser.save();
    res.status(201).json({ message: "User created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. లాగిన్ (ఒక సెషన్ మాత్రమే అనుమతి)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (user.isLoggedIn) return res.status(403).json({ success: false, message: "Account already active elsewhere." });

    user.isLoggedIn = true;
    await user.save();

    res.json({ success: true, userId: user._id, username: user.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. ఫోర్స్ లాగౌట్ (అడ్మిన్ కోసం)
router.post('/force-logout', async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { isLoggedIn: false });
    res.json({ success: true, message: "User logged out" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. డిలీట్ యూజర్
router.delete('/delete/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. సెషన్ చెక్ (యూజర్ ఐడి ద్వారా)
router.post('/check-status', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (user && !user.isLoggedIn) res.json({ active: false });
    else res.json({ active: true });
});

module.exports = router;