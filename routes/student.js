const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Innovation = require('../models/innovation');
const User = require('../models/user');
const Hackathon = require('../models/hackathon');
const StudentPoints = require('../models/StudentPoints');
const { isAuthenticated } = require('../middleware/auth');

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

// Student Adding New Proposal
// router.post(
//   '/innovation/new',
//   upload.single('proposalFile'),
//   async (req, res) => {
//     try {
//       // console.log('📝 Received Form Data:', req.body);
//       // console.log('📂 Uploaded File:', req.file);

//       if (!req.session || !req.session.user) {
//         return res.status(401).send('Unauthorized: User not logged in.');
//       }

//       const innovation = new Innovation({
//         title: req.body.title,
//         category: req.body.category,
//         description: req.body.description,
//         keyFeatures: req.body.keyFeatures,
//         department: req.body.department,
//         collaborators: req.body.collaborators
//           ? req.body.collaborators.split(',')
//           : [],
//         mentors: req.body.mentors ? req.body.mentors.split(',') : [],
//         info: req.body.info,
//         proposalFile: req.file ? req.file.filename : null,
//         studentName: req.body.studentName,
//       });

//       await innovation.save();
//       // console.log('✅ Innovation saved successfully!');
//       res.redirect('/user/dashboard');
//     } catch (error) {
//       // console.error('❌ Error saving innovation:', error);
//       res.status(500).send('Error saving innovation.');
//     }
//   }
// );

const {
  extractTextFromPDF,
  getAIRating,
} = require('../services/aiRating.service');

// ✅ Student Adding New Proposal
const path = require('path');

router.post(
  '/innovation/new',
  upload.single('proposalFile'),
  async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        req.flash('error_msg', 'Unauthorized: User not logged in.');
        res.redirect("/user/login")
        // return res.status(401).send('Unauthorized: User not logged in.');
      }

      const userId = req.session.user._id;
      let collaborators = [];

      if (req.body.collaborators && req.body.collaborators.trim()) {
        const collaboratorIds = req.body.collaborators
          .split(',')
          .map((id) => id.trim());

        for (const id of collaboratorIds) {
          const userWithPrn = await User.findOne({ PRN: id });
          if (userWithPrn) {
            collaborators.push(id); // keep PRN for your schema
          } else {
            console.warn(`⚠️ Collaborator with PRN ${id} not found`);
          }
        }
      }

      // ✅ Extract PDF text and get AI rating
      let aiRating = 1;
      if (req.file) {
        const filePath = path.join(__dirname, '../uploads', req.file.filename);
        const text = await extractTextFromPDF(filePath);
        const ratingFromAI = await getAIRating(text);
        if (ratingFromAI && ratingFromAI >= 1 && ratingFromAI <= 10) {
          aiRating = ratingFromAI;
        }
      }

      const innovation = new Innovation({
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        keyFeatures: req.body.keyFeatures,
        department: req.body.department,
        collaborators: collaborators,
        mentors: req.body.mentors ? req.body.mentors.split(',') : [],
        info: req.body.info,
        proposalFile: req.file?.filename || null,
        studentName: req.body.studentName,
        user: userId,
        rating: aiRating, // ✅ Save AI rating
      });

      const savedInnovation = await innovation.save();

      await User.findByIdAndUpdate(userId, {
        $push: { innovations: savedInnovation._id },
      });

      await User.updateMany(
        { PRN: { $in: collaborators } },
        { $push: { innovations: savedInnovation._id } }
      );

      // console.log('✅ Innovation saved and rated with AI!');
      req.flash('success_msg', 'Unauthorized: User not logged in.');
      res.redirect('/user/dashboard');
    } catch (error) {
      // console.error('❌ Error saving innovation:', error);
      // res.status(500).send('Error saving innovation.');
    req.flash('error_msg', 'Error saving innovation.');
    res.redirect('/user/dashboard');
    }
  }
);

// Student view form
router.get('/uploads/:id', async (req, res) => {
  let _id = req.params.id;
  let adminUser = await Innovation.findOne({ _id });
  res.render('utils/view_form', { adminUser });
});

// Get student dashboard with points
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Get student's points
    let studentPoints = await StudentPoints.findOne({
      studentId: req.user._id,
    })
      .populate('studentId', 'name email')
      .lean();

    // Get student's innovations
    const innovations = await Innovation.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Get upcoming hackathons
    const hackathons = await Hackathon.find({ date: { $gte: new Date() } })
      .sort({ date: 1 })
      .limit(5)
      .lean();

    // If no points record exists or if there are approved innovations without points, update points
    if (!studentPoints) {
      const { updateStudentPoints } = require('../services/points.service');
      await updateStudentPoints(req.user._id);

      // Fetch the newly created points record
      studentPoints = await StudentPoints.findOne({
        studentId: req.user._id,
      })
        .populate('studentId', 'name email')
        .lean();
    }

    // Calculate rank
    let rank = null;
    if (studentPoints) {
      const higherRanked = await StudentPoints.countDocuments({
        totalPoints: { $gt: studentPoints.totalPoints },
      });
      rank = higherRanked + 1;
    }

    // Attach points data to user object
    const userWithPoints = {
      ...req.user.toObject(),
      points: studentPoints
        ? {
          ...studentPoints,
          rank,
        }
        : null,
    };

    res.render('dashboards/dashboard', {
      user: userWithPoints,
      innovations,
      hackathons,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).render('error', {
      message: 'Error loading dashboard',
      error,
    });
  }
});

module.exports = router;
