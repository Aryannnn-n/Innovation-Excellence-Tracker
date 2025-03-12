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
const Hackathon = require('./models/hackathon');

const session = require('express-session');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '/public')));

// multer setup
// const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
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

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use('/uploads', express.static('uploads'));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

app.get('/', async (req, res) => {
  const hackathons = await Hackathon.find(); // Fetch from DB
  res.render('index', { user: req.session.user, hackathons });
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

// dashboard after login
app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = req.session.user;

  try {
    if (user.role === 'student') {
      // Show all innovation submissions to students
      const innovations = await Innovation.find();
      return res.render('dashboard', { user, innovations });
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

      return res.render('facultyDashboard', {
        user,
        pendingProposals,
        approvedProposals,
        rejectedProposals,
      });
    }

    if (user.role === 'admin') {
      // Admin sees all proposals and can manage them
      const innovations = await Innovation.find();
      const hackathons = await Hackathon.find(); // Fetch all hackathons
      return res.render('dashboard_admin', { user, innovations, hackathons });
    }

    // If user role is unknown, redirect to login
    res.redirect('/login');
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Student Adding New Proposal
app.post('/innovation/new', upload.single('proposalFile'), async (req, res) => {
  try {
    // console.log('📝 Received Form Data:', req.body);
    // console.log('📂 Uploaded File:', req.file);

    if (!req.session || !req.session.user) {
      return res.status(401).send('Unauthorized: User not logged in.');
    }

    const innovation = new Innovation({
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      keyFeatures: req.body.keyFeatures,
      department: req.body.department,
      collaborators: req.body.collaborators
        ? req.body.collaborators.split(',')
        : [],
      mentors: req.body.mentors ? req.body.mentors.split(',') : [],
      info: req.body.info,
      proposalFile: req.file ? req.file.filename : null,
      studentName: req.body.studentName,
    });

    await innovation.save();
    // console.log('✅ Innovation saved successfully!');
    res.redirect('/dashboard');
  } catch (error) {
    // console.error('❌ Error saving innovation:', error);
    res.status(500).send('Error saving innovation.');
  }
});

// Teacher approving or rejecting proposal
app.post('/approve-proposal', async (req, res) => {
  try {
    const { proposalId } = req.body;

    const updatedProposal = await Innovation.findByIdAndUpdate(
      proposalId,
      { status: 'approved' },
      { new: true } // Returns the updated document
    );

    if (!updatedProposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error approving proposal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reject Proposal Route
app.post('/reject-proposal', async (req, res) => {
  try {
    const { proposalId } = req.body;

    const updatedProposal = await Innovation.findByIdAndUpdate(
      proposalId,
      { status: 'rejected' },
      { new: true }
    );

    if (!updatedProposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE Innovation Route
app.post('/delete-innovation/:id', async (req, res) => {
  try {
    const innovationId = req.params.id;

    // Find the innovation and delete it
    const deletedInnovation = await Innovation.findByIdAndDelete(innovationId);

    if (!deletedInnovation) {
      return res.status(404).send('Innovation not found');
    }

    res.redirect('/dashboard'); // Redirect back to the admin panel
  } catch (error) {
    console.error('Error deleting innovation:', error);
    res.status(500).send('Server Error');
  }
});

// Hackthon
app.post('/post-hackathon', async (req, res) => {
  try {
    const { title, date, description, registrationLink } = req.body;

    // Create a new hackathon entry
    const newHackathon = new Hackathon({
      title,
      date,
      description,
      registrationLink,
    });

    await newHackathon.save(); // Save to MongoDB

    // Redirect to admin dashboard with success message
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error posting hackathon:', error);
    res.status(500).send('Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
