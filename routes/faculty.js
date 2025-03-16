const express = require('express');
const router = express.Router();
const Innovation = require('../models/innovation');
const User = require('../models/user');

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

// faculty view form
router.get('/viewform/:id', async (req, res) => {
  let _id = req.params.id;
  let adminUser = await Innovation.findOne({ _id });
  res.render('utils/view_form', { adminUser });
});


// Reject Proposal Route
router.post('/reject-proposal', async (req, res) => {
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

    res.redirect('/user/dashboard');
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Teacher approving or rejecting proposal
router.post('/approve-proposal', async (req, res) => {
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

    res.redirect('/user/dashboard');
  } catch (error) {
    console.error('Error approving proposal:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
