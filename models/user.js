const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// const RegistrationSchema = new mongoose.Schema({
//   name: String,
//   user: { type: Schema.Types.ObjectId, ref: 'User'},
//   date: { type: Date, default: Date.now },
//   year: { type: Number, required: true }
// });

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["faculty", "student", "admin"],
      default: "student",
    },
    department: {
      type: String,
      enum: ["CSE", "ECE", "MECH", "Civil", "Biotech", "Others"],
      required: true,
    },
    PRN: {
      type: String,
      required: function () {
        return this.role === "student";
      },
      default: "null",
    },
    // ✅ Store all innovations submitted by the user
    innovations: [{ type: Schema.Types.ObjectId, ref: "Innovation" }],
    registrations: [{ type: Schema.Types.ObjectId, ref: "User" }],
    date: { type: Date, default: Date.now },
    year: { type: Number },
  },
  {
    timestamps: true, // Add createdAt and updatedAt fields
  }
);

// Add a method to check if a user has registered a specific user
UserSchema.methods.hasRegistered = function (userId) {
  return this.registrations.some((reg) => reg.toString() === userId.toString());
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
