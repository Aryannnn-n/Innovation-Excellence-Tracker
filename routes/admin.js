const express = require('express');
const router = express.Router();

const Innovation = require('../models/innovation');
const User = require('../models/user');
const Hackathon = require('../models/hackathon');

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

// Hackathon
router.post('/post-hackathon', async (req, res) => {
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
    res.redirect('/user/dashboard');
  } catch (error) {
    console.error('Error posting hackathon:', error);
    res.status(500).send('Server Error');
  }
});

// Hacktathon delete admin
router.post('/delete-hackathon/:id', async (req, res) => {
  try {
    const hackathonId = req.params.id;
    await Hackathon.findByIdAndDelete(hackathonId);
    res.redirect('/user/dashboard'); // Adjust the redirect path if necessary
  } catch (error) {
    console.error('Error deleting hackathon:', error);
    res.status(500).send('Internal Server Error');
  }
});

// DELETE Innovation Route
router.post('/delete-innovation/:id', async (req, res) => {
  try {
    const innovationId = req.params.id;

    // Find the innovation and delete it
    const deletedInnovation = await Innovation.findByIdAndDelete(innovationId);

    if (!deletedInnovation) {
      return res.status(404).send('Innovation not found');
    }

    res.redirect('/user/dashboard'); // Redirect back to the admin panel
  } catch (error) {
    console.error('Error deleting innovation:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
