const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Innovation = require("../models/innovation");
const User = require("../models/user");
const Hackathon = require("../models/hackathon");
const StudentPoints = require("../models/StudentPoints");
const { isAuthenticated } = require("../middleware/auth");

// multer setup
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
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
} = require("../services/aiRating.service");

// ✅ Student Adding New Proposal
router.post(
  "/innovation/new",
  upload.single("proposalFile"),
  async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).send("Unauthorized: User not logged in.");
      }

      const userId = req.session.user._id; // Logged-in student

      // ✅ Convert collaborators to an array of ObjectIds
      let collaborators = [];
      if (req.body.collaborators && req.body.collaborators.trim()) {
        // Split by comma and trim each ID
        const collaboratorIds = req.body.collaborators
          .split(",")
          .map((id) => id.trim());

        // Validate that each ID is a valid ObjectId
        for (const id of collaboratorIds) {
            let Prn = await User.find({PRN: id})
          if (Prn) {
            collaborators.push(id);
          } else {
            console.warn(`Invalid collaborator ID: ${id}`);
          }
        }
      }

      // ✅ Create Innovation document
      const innovation = new Innovation({
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        keyFeatures: req.body.keyFeatures,
        department: req.body.department,
        collaborators: collaborators, // ✅ Store as ObjectId references
        mentors: req.body.mentors ? req.body.mentors.split(",") : [],
        info: req.body.info,
        proposalFile: req.file?.filename || null,
        studentName: req.body.studentName,
        user: userId, // ✅ Link innovation to the submitting user
      });

      // ✅ Save the innovation
      const savedInnovation = await innovation.save();

      // ✅ Update the submitting student's innovations array
      await User.findByIdAndUpdate(userId, {
        $push: { innovations: savedInnovation._id },
      });

      // ✅ Also update all collaborators' innovations array
      await User.updateMany(
        { PRN: { $in: collaborators }},
        { $push: { innovations: savedInnovation._id } }
      );

      console.log(
        "✅ Innovation saved successfully and linked to collaborators!"
      );
      res.redirect("/user/dashboard");
    } catch (error) {
      console.error("❌ Error saving innovation:", error);
      res.status(500).send("Error saving innovation.");
    }
  }
);

// Student view form
router.get("/uploads/:id", async (req, res) => {
  let _id = req.params.id;
  let adminUser = await Innovation.findOne({ _id });
  res.render("utils/view_form", { adminUser });
});

// Get student dashboard with points
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    // Get student's points
    let studentPoints = await StudentPoints.findOne({
      studentId: req.user._id,
    })
      .populate("studentId", "name email")
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
      const { updateStudentPoints } = require("../services/points.service");
      await updateStudentPoints(req.user._id);

      // Fetch the newly created points record
      studentPoints = await StudentPoints.findOne({
        studentId: req.user._id,
      })
        .populate("studentId", "name email")
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

    res.render("dashboards/dashboard", {
      user: userWithPoints,
      innovations,
      hackathons,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).render("error", {
      message: "Error loading dashboard",
      error,
    });
  }
});

module.exports = router;
