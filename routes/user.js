const express = require('express');
const router = express.Router();
const Innovation = require('../models/innovation');
const User = require('../models/user');
const Hackathon = require('../models/hackathon');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// multer setup
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Use the original name of the file
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  const { name, email, password, role, department } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/register', { error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department,
    });
    await newUser.save();

    res.redirect('/user/login');
  } catch (error) {
    res.render('auth/register', { error: 'Error registering user' });
  }
});

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('auth/login', { error: 'Invalid credentials' });
  }

  req.session.user = user;
  res.redirect('/user/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// dashboard after login
router.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/user/login');

  const user = req.session.user;

  try {
    if (user.role === 'student') {
      // Show all innovation submissions to students
      const innovations = await Innovation.find({user: req.session.user}); // only logged in user innovations display
      return res.render('dashboards/dashboard', { user, innovations });
    }

    if (user.role === 'faculty') {
      // Fetch all proposals and categorize them
      const allProposals = await Innovation.find();
      const pendingProposals = allProposals.filter(
        (p) => p.status === 'pending'
      );
      const approvedProposals = allProposals.filter(
        (p) => p.status === 'approved'
      );
      const rejectedProposals = allProposals.filter(
        (p) => p.status === 'rejected'
      );

      return res.render('dashboards/dashboard_faculty', {
        user,
        pendingProposals,
        approvedProposals,
        rejectedProposals,
      });
    }

    if (user.role === 'admin') {
      // Admin sees all proposals and can manage them
      const innovations = await Innovation.find({status:"approved"});
      const hackathons = await Hackathon.find(); // Fetch all hackathons
      return res.render('dashboards/dashboard_admin', {
        user,
        innovations,
        hackathons,
      });
    }

    // If user role is unknown, redirect to login
    res.redirect('/user/login');
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
