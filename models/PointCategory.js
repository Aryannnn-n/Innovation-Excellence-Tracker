const mongoose = require("mongoose");

const pointCategorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
  },
  subCategories: [
    {
      name: {
        type: String,
        required: true,
      },
      basePoints: {
        type: Number,
        required: true,
      },
      statusMultipliers: {
        Submitted: {
          type: Number,
          default: 1,
        },
        FacultyApproved: {
          type: Number,
          default: 1.5,
        },
        AdminApproved: {
          type: Number,
          default: 2,
        },
        Implemented: {
          type: Number,
          default: 3,
        },
      },
      bonusPoints: {
        recognition: {
          type: Number,
          default: 10,
        },
        collaboration: {
          type: Number,
          default: 5,
        },
      },
    },
  ],
});

// Default categories and their point values
const defaultCategories = [
  {
    category: "Hackathon",
    subCategories: [
      {
        name: "Participation",
        basePoints: 10,
      },
      {
        name: "Winner",
        basePoints: 30,
      },
    ],
  },
  {
    category: "Patent",
    subCategories: [
      {
        name: "Filed",
        basePoints: 50,
      },
    ],
  },
  {
    category: "Research",
    subCategories: [
      {
        name: "Paper Published",
        basePoints: 40,
      },
    ],
  },
  {
    category: "Startup",
    subCategories: [
      {
        name: "Incubation",
        basePoints: 100,
      },
    ],
  },
];

// Initialize default categories if none exist
pointCategorySchema.statics.initializeDefaults = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(defaultCategories);
  }
};

module.exports = mongoose.model("PointCategory", pointCategorySchema);
