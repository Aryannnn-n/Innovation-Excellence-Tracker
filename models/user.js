const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// const RegistrationSchema = new mongoose.Schema({
//   name: String,
//   user: { type: Schema.Types.ObjectId, ref: 'User'},
//   date: { type: Date, default: Date.now },
//   year: { type: Number, required: true }
// });

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
  PRN:{
    type: String,
    required: true,
    default: 'null',
  },
  // ✅ Store all innovations submitted by the user
  innovations: [{ type: Schema.Types.ObjectId, ref: 'Innovation' }],
  registrations: [{ type: Schema.Types.ObjectId, ref: 'User'}],
  date: { type: Date, default: Date.now },
  year: { type: Number  }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
