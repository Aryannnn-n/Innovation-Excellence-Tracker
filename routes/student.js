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

// ✅ Student Adding New Proposal
router.post(
  '/innovation/new',
  upload.single('proposalFile'),
  async (req, res) => {
    try {
      // console.log('📝 Received Form Data:', req.body);
      // console.log('📂 Uploaded File:', req.file);

      // ✅ Check if user is logged in
      if (!req.session || !req.session.user) {
        return res.status(401).send('Unauthorized: User not logged in.');
      }

      const userId = req.session.user._id; // Get logged-in user's ID

      // ✅ Create Innovation document
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
        proposalFile: req.file?.filename || null,
        studentName: req.body.studentName,
        user: userId, // ✅ Link innovation to the user
      });

      // ✅ Save the innovation
      const savedInnovation = await innovation.save();

      // ✅ Also update User's innovations array
      await User.findByIdAndUpdate(userId, {
        $push: { innovations: savedInnovation._id },
      });

      console.log('✅ Innovation saved successfully!');
      res.redirect('/user/dashboard');
    } catch (error) {
      console.error('❌ Error saving innovation:', error);
      res.status(500).send('Error saving innovation.');
    }
  }
);

// Student view form
router.get('/uploads/:id', async (req, res) => {
  let _id = req.params.id;
  let adminUser = await Innovation.findOne({ _id });
  res.render('utils/view_form', { adminUser });
});

module.exports = router;
