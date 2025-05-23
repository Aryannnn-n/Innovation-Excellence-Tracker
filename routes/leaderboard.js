const express = require("express");
const router = express.Router();
const StudentPoints = require("../models/StudentPoints");
const { isAuthenticated } = require("../middleware/auth");

// Get top 3 students for the homepage
router.get("/top", async (req, res) => {
  try {
    const topStudents = await StudentPoints.find()
      .sort({ totalPoints: -1 })
      .limit(3)
      .populate("studentId", "name email");

    res.json(topStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get complete leaderboard with search and filtering
router.get("/complete", isAuthenticated, async (req, res) => {
  try {
    const { search, category, timeFrame } = req.query;
    let query = {};

    // Search by name or rank
    if (search) {
      query.$or = [{ "studentId.name": { $regex: search, $options: "i" } }];
    }

    // Filter by category
    if (category && category !== "all") {
      query["achievements.category"] = category;
    }

    // Filter by time frame
    if (timeFrame === "month") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      query.lastUpdated = { $gte: startOfMonth };
    }

    const leaderboard = await StudentPoints.find(query)
      .sort({ totalPoints: -1 })
      .populate("studentId", "name email")
      .lean();

    // Add rank to each student
    const rankedLeaderboard = leaderboard.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student's individual points and achievements
router.get("/student/:studentId", isAuthenticated, async (req, res) => {
  try {
    const studentPoints = await StudentPoints.findOne({
      studentId: req.params.studentId,
    }).populate("studentId", "name email");

    if (!studentPoints) {
      // return res.status(404).json({ message: "Student points not found" });
      req.flash('error_msg', 'Student points not found');
      res.redirect("/student/:studentId")
    }
    res.json(studentPoints);
  } catch (error) {
    req.flash('error_msg', 'Student points not found');
    // res.status(500).json({ message: error.message });
    res.redirect("/student/:studentId")
  }
});

// Add points for a student's achievement
router.post("/points/add", isAuthenticated, async (req, res) => {
  try {
    const { studentId, achievement } = req.body;

    let studentPoints = await StudentPoints.findOne({ studentId });

    if (!studentPoints) {
      studentPoints = new StudentPoints({ studentId });
    }

    studentPoints.achievements.push(achievement);
    await studentPoints.save();

    res.json(studentPoints);
  } catch (error) {
    // res.status(500).json({ message: error.message });     
    req.flash('error_msg', 'Student points not found');
    res.redirect("/student/:studentId")
  }
});

// Update all student points (admin only)
router.post("/update-all-points", isAuthenticated, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== "admin") {
      req.flash('error_msg', 'Student points not found');
       res.redirect("/user/dashboard")
      // return res
      //   .status(403)
      //   .json({ message: "Unauthorized: Admin access required" });
    }

    const { updateAllStudentPoints } = require("../services/points.service");

    // Get count of students before update
    const User = require("../models/user");
    const studentCount = await User.countDocuments({ role: "student" });

    // Update all student points
    const updateResult = await updateAllStudentPoints();

    // Get updated leaderboard data
    const updatedLeaderboard = await StudentPoints.find()
      .sort({ totalPoints: -1 })
      .populate("studentId", "name email")
      .lean();

    // Add rank to each student
    const rankedLeaderboard = updatedLeaderboard.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

    res.json({
      message: `Successfully updated points for ${updateResult.updatedCount} out of ${studentCount} students`,
      success: updateResult.success,
      updatedCount: updateResult.updatedCount,
      totalStudents: studentCount,
      errorCount: updateResult.errors.length,
      topStudents: rankedLeaderboard.slice(0, 5), // Return top 5 students for reference
    });
  } catch (error) {
    console.error("Error updating all student points:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all participants with points
router.get("/participants", async (req, res) => {
  try {
    const participants = await StudentPoints.find()
      .sort({ totalPoints: -1 })
      .populate("studentId", "name email")
      .lean();

    // Add rank to each participant
    const rankedParticipants = participants.map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));

    res.render("leaderboard/participants", {
      participants: rankedParticipants,
      user: req.user,
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).render("error", {
      message: "Error fetching participants",
      error: error,
    });
  }
});

module.exports = router;
