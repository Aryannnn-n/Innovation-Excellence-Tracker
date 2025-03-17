const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['faculty', 'student', 'admin'],
    default: 'student',
  },
  department: {
    type: String,
    enum: ['CSE', 'ECE', 'MECH', 'Civil', 'Biotech', 'Others'],
    required: true,
  },
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
