const mongoose = require("mongoose");

const studentPointsSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  achievements: [
    {
      category: {
        type: String,
        enum: ["Hackathon", "Patent", "Research", "Startup", "Other"],
        required: true,
      },
      subCategory: {
        type: String,
        required: true,
      },
      points: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ["Submitted", "FacultyApproved", "AdminApproved", "Implemented"],
        required: true,
      },
      description: String,
      date: {
        type: Date,
        default: Date.now,
      },
      recognition: {
        type: Boolean,
        default: false,
      },
      collaboration: {
        type: Boolean,
        default: false,
      },
    },
  ],
  monthlyPoints: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Update total points whenever achievements are modified
studentPointsSchema.pre("save", function (next) {
  this.totalPoints = this.achievements.reduce(
    (sum, achievement) => sum + achievement.points,
    0
  );
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model("StudentPoints", studentPointsSchema);
