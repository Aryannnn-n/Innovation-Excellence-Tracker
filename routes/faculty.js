const express = require("express");
const router = express.Router();
const Innovation = require("../models/innovation");
const User = require("../models/user");
const Notification = require("../models/notification");
const { updateStudentPoints } = require("../services/points.service");

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

// faculty view form
router.get("/viewform/:id", async (req, res) => {
  let _id = req.params.id;
  let adminUser = await Innovation.findOne({ _id });
  res.render("utils/view_form", { adminUser });
});

// Reject Proposal Route
// router.post('/reject-proposal', async (req, res) => {
//   try {
//     const { proposalId } = req.body;

//     const updatedProposal = await Innovation.findByIdAndUpdate(
//       proposalId,
//       { status: 'rejected' },
//       { new: true }
//     );

//     if (!updatedProposal) {
//       return res.status(404).json({ message: 'Proposal not found' });
//     }

//     res.redirect('/user/dashboard');
//   } catch (error) {
//     console.error('Error rejecting proposal:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// Teacher approving or rejecting proposal
// router.post('/approve-proposal', async (req, res) => {
//   try {
//     const { proposalId } = req.body;

//     const updatedProposal = await Innovation.findByIdAndUpdate(
//       proposalId,
//       { status: 'approved' },
//       { new: true } // Returns the updated document
//     );

//     if (!updatedProposal) {
//       return res.status(404).json({ message: 'Proposal not found' });
//     }

//     res.redirect('/user/dashboard');
//   } catch (error) {
//     console.error('Error approving proposal:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// Faculty approve proposal
router.post("/approve-proposal/:id", async (req, res) => {
  try {
    const proposalId = req.params.id;

    // Find the proposal first to check if it exists
    const proposal = await Innovation.findById(proposalId);

    if (!proposal) {
      return res.status(404).send("Proposal not found");
    }

    // Update the proposal status
    proposal.status = "FacultyApproved";
    proposal.approvedDate = new Date();
    await proposal.save();

    // Update student points
    await updateStudentPoints(proposal.user);

    // Create notification for the student
    await Notification.create({
      userId: proposal.user,
      message: `Your proposal "${proposal.title}" has been approved by faculty!`,
      createdAt: new Date(),
      type: "approval",
    });

    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Error approving proposal:", error);
    res.status(500).send("Server Error");
  }
});

// Reject Proposal with Reason
router.post("/reject-proposal", async (req, res) => {
  try {
    const { proposalId, rejectionReason } = req.body;
    const proposal = await Innovation.findByIdAndUpdate(proposalId, {
      status: "rejected",
      rejectionReason: rejectionReason,
    });

    // Create Notification for the Student
    await Notification.create({
      userId: proposal.user,
      message: `Your proposal "${proposal.title}" has been rejected. Reason: ${rejectionReason}`,
      createdAt: new Date(),
      type: "rejection",
    });

    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Error rejecting proposal:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
