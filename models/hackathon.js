const mongoose = require('mongoose');

const HackathonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  registrationLink: {
    type: String,
    required: true,
  },
});

const Hackathon = mongoose.model('Hackathon', HackathonSchema);
module.exports = Hackathon;
