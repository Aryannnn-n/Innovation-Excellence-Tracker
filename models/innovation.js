const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InnovationSchema = new Schema({
  title: { type: String, required: true },
  category: {
    type: String,
    enum: [
      'Hackathon',
      'Startups',
      'Projects',
      'Patents',
      'Awards',
      'Research',
    ],
    required: true,
  },

  description: { type: String, required: true },
  contributors: String,
  department: {
    type: String,
    enum: ['CSE', 'ECE', 'Mechanical', 'Civil', 'Biotech', 'Others'],
    required: true,
  },
  collaborators: [String],
  mentors: [String],
  keyFeatures: String,
  info: String,
  proposalFile: { type: String },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  studentName: { type: String, required: true }, // ✅ Fix this line
});

const Innovation = mongoose.model('Innovation', InnovationSchema);
module.exports = Innovation;
