const StudentPoints = require("../models/StudentPoints");
const PointCategory = require("../models/PointCategory");
const Innovation = require("../models/innovation");

/**
 * Calculate points for a student based on their approved innovations
 * @param {string} studentId - The ID of the student
 * @returns {Promise<number>} - The total points calculated
 */
async function calculateStudentPoints(studentId) {
  try {
    // Get all approved innovations for the student
    const approvedInnovations = await Innovation.find({
      user: studentId,
      status: { $in: ["FacultyApproved", "AdminApproved", "Implemented"] },
    });

    // Get point categories
    const pointCategories = await PointCategory.find();
    const categoryMap = {};
    pointCategories.forEach((category) => {
      categoryMap[category.category] = category;
    });

    let totalPoints = 0;
    let monthlyPoints = 0;
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    // Calculate points for each innovation
    for (const innovation of approvedInnovations) {
      const category = categoryMap[innovation.category];
      if (!category) continue;

      // Find the appropriate subcategory
      const subCategory = category.subCategories.find(
        (sub) => sub.name.toLowerCase() === innovation.subCategory.toLowerCase()
      );

      if (!subCategory) continue;

      // Calculate base points
      let points = subCategory.basePoints;

      // Apply status multiplier
      const statusMultiplier =
        subCategory.statusMultipliers[innovation.status] || 1;
      points *= statusMultiplier;

      // Add bonus points for recognition
      if (innovation.recognition) {
        points += subCategory.bonusPoints.recognition || 0;
      }

      // Add bonus points for collaboration
      if (innovation.collaborators && innovation.collaborators.length > 0) {
        points += subCategory.bonusPoints.collaboration || 0;
      }

      totalPoints += points;

      // Check if innovation is from current month for monthly points
      if (innovation.approvedDate && innovation.approvedDate >= startOfMonth) {
        monthlyPoints += points;
      }
    }

    return { totalPoints, monthlyPoints };
  } catch (error) {
    console.error("Error calculating student points:", error);
    return { totalPoints: 0, monthlyPoints: 0 };
  }
}

/**
 * Update or create student points record
 * @param {string} studentId - The ID of the student
 * @returns {Promise<Object>} - The updated student points record
 */
async function updateStudentPoints(studentId) {
  try {
    // Calculate points
    const { totalPoints, monthlyPoints } = await calculateStudentPoints(
      studentId
    );

    // Find or create student points record
    let studentPoints = await StudentPoints.findOne({ studentId });

    if (!studentPoints) {
      studentPoints = new StudentPoints({ studentId });
    }

    // Get all approved innovations for the student
    const approvedInnovations = await Innovation.find({
      user: studentId,
      status: { $in: ["FacultyApproved", "AdminApproved", "Implemented"] },
    });

    // Get point categories
    const pointCategories = await PointCategory.find();
    const categoryMap = {};
    pointCategories.forEach((category) => {
      categoryMap[category.category] = category;
    });

    // Clear existing achievements
    studentPoints.achievements = [];

    // Add achievements for each approved innovation
    for (const innovation of approvedInnovations) {
      const category = categoryMap[innovation.category];
      if (!category) continue;

      // Find the appropriate subcategory
      const subCategory = category.subCategories.find(
        (sub) =>
          sub.name.toLowerCase() ===
          (innovation.subCategory || "Participation").toLowerCase()
      );

      if (!subCategory) continue;

      // Calculate base points
      let points = subCategory.basePoints;

      // Apply status multiplier
      const statusMultiplier =
        subCategory.statusMultipliers[innovation.status] || 1;
      points *= statusMultiplier;

      // Add bonus points for recognition
      if (innovation.recognition) {
        points += subCategory.bonusPoints.recognition || 0;
      }

      // Add bonus points for collaboration
      if (innovation.collaborators && innovation.collaborators.length > 0) {
        points += subCategory.bonusPoints.collaboration || 0;
      }

      // Add achievement
      studentPoints.achievements.push({
        category: innovation.category,
        subCategory: innovation.subCategory || "Participation",
        points: points,
        status: innovation.status,
        description: innovation.title,
        date: innovation.approvedDate || new Date(),
        recognition: innovation.recognition || false,
        collaboration:
          innovation.collaborators && innovation.collaborators.length > 0,
      });
    }

    // Update points
    studentPoints.totalPoints = totalPoints;
    studentPoints.monthlyPoints = monthlyPoints;
    studentPoints.lastUpdated = new Date();

    // Save the record
    await studentPoints.save();

    return studentPoints;
  } catch (error) {
    console.error("Error updating student points:", error);
    throw error;
  }
}

/**
 * Update points for all students
 * @returns {Promise<void>}
 */
async function updateAllStudentPoints() {
  try {
    // Get all users with role 'student'
    const User = require("../models/user");
    const students = await User.find({ role: "student" });

    for (const student of students) {
      await updateStudentPoints(student._id);
    }

    console.log(`Updated points for ${students.length} students`);
  } catch (error) {
    console.error("Error updating all student points:", error);
  }
}

module.exports = {
  calculateStudentPoints,
  updateStudentPoints,
  updateAllStudentPoints,
};
