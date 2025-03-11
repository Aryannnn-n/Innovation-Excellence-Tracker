const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

// database file setup
const Innovation = require('./models/innovation');
const User = require('./models/user');

const session = require('express-session');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '/public')));

// multer setup
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

app.get('/', async (req, res) => {
  // let innovations = await await Innovation.find();
  // console.log(innovations);
  res.render('index', { user: req.session.user });
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { name, email, password, role, department } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', { error: 'User already exists' });
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

    res.redirect('/login');
  } catch (error) {
    res.render('register', { error: 'Error registering user' });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { error: 'Invalid credentials' });
  }

  req.session.user = user;
  res.redirect('/dashboard');
});

app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = req.session.user;

  // Student Dashboard: Can add innovations & view all students' entries
  if (user.role === 'student') {
    const innovations = await Innovation.find(); // Show all submissions
    return res.render('dashboard', { user, innovations });
  }

  // Faculty Dashboard: Can accept or reject student data
  if (user.role === 'faculty') {
    const pendingInnovations = await Innovation.find({ status: 'pending' }); // Show only pending submissions
    return res.render('facultyDashboard', { user, pendingInnovations });
  }

  // Admin Dashboard: Can edit, delete, and manage all data
  if (user.role === 'admin') {
    const innovations = await Innovation.find(); // Show all submissions
    return res.render('dashboard_admin', { user, innovations });
  }

  // Default case (if role is not recognized)
  res.redirect('/login');
});

app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const innovations = await Innovation.find();
  res.render('dashboard', { user: req.session.user, innovations });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Student Adding New Proposal
app.post('/innovation/new', upload.single('proposalFile'), async (req, res) => {
  if (!req.session.user || req.session.user.role === 'student') {
    return res.redirect('/dashboard');
  }

  console.log('📝 Received Form Data:', req.body);
  console.log('📂 Uploaded File:', req.file);

  // Check for missing required fields
  if (
    !req.body.title ||
    !req.body.category ||
    !req.body.description ||
    !req.body.department
  ) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const innovation = new Innovation({
      title: req.body.title,
      category: req.body.category, // ✅ This should match the dropdown name
      description: req.body.description,
      department: req.body.department,
      proposalFile: req.file ? req.file.filename : null,
      createdBy: req.session.user._id,
    });
    
    await innovation.save();
    console.log('✅ Innovation saved successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ Error saving innovation:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
