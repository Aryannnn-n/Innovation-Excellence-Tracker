const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InnovationSchema = new Schema({
  title: { type: String, required: true },
  category: {
    type: String,
    enum: [
      "Hackathon",
      "Startups",
      "Projects",
      "Patents",
      "Awards",
      "Research",
    ],
    required: true,
  },
  subCategory: {
    type: String,
    required: true,
    default: "Participation", // Default subcategory
  },
  description: { type: String, required: true },
  contributors: String,
  department: {
    type: String,
    enum: ["CSE", "ECE", "Mechanical", "Civil", "Biotech", "Others"],
    required: true,
  },
  collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }], // ✅ Store collaborators as ObjectId
  mentors: [String],
  keyFeatures: String,
  info: String,
  proposalFile: { type: String },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: [
      "pending",
      "FacultyApproved",
      "AdminApproved",
      "Implemented",
      "rejected",
    ],
    default: "pending",
  },
  studentName: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 10, default: 1 },
  recognition: { type: Boolean, default: false },
  collaboration: { type: Boolean, default: false },
  approvedDate: { type: Date },
  points: { type: Number, default: 0 },
  rejectionReason: { type: String, default: "No reason provided" },
});

// Update points when status changes
InnovationSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    ["FacultyApproved", "AdminApproved", "Implemented"].includes(this.status)
  ) {
    this.approvedDate = new Date();
  }
  next();
});

const Innovation = mongoose.model("Innovation", InnovationSchema);
module.exports = Innovation;
