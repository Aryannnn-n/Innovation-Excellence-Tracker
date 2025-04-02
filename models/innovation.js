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
  collaborators: [{ type: Schema.Types.ObjectId, ref: 'User' }], // ✅ Store collaborators as ObjectId
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
  studentName: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 10, default: 1 },
});

const Innovation = mongoose.model('Innovation', InnovationSchema);
module.exports = Innovation;
