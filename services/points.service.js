const StudentPoints = require("../models/StudentPoints");
const PointCategory = require("../models/PointCategory");
const Innovation = require("../models/innovation");
const User = require("../models/user");

/**
 * Calculate points for a student based on their approved innovations
 * @param {string} studentId
 * @returns {Promise<{totalPoints: number, monthlyPoints: number}>}
 */
async function calculateStudentPoints(studentId) {
  try {
    const approvedInnovations = await Innovation.find({
      user: studentId,
      status: { $in: ["FacultyApproved", "AdminApproved", "Implemented"] },
    });

    const pointCategories = await PointCategory.find();
    const categoryMap = Object.fromEntries(
      pointCategories.map((c) => [c.category, c])
    );

    let totalPoints = 0;
    let monthlyPoints = 0;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    for (const innovation of approvedInnovations) {
      const category = categoryMap[innovation.category];
      if (!category) continue;

      const subCategory = category.subCategories.find(
        (sub) => sub.name.toLowerCase() === (innovation.subCategory || "").toLowerCase()
      );
      if (!subCategory) continue;

      let points = subCategory.basePoints;
      const statusMultiplier = subCategory.statusMultipliers[innovation.status] || 1;
      points *= statusMultiplier;

      if (innovation.recognition) {
        points += subCategory.bonusPoints?.recognition || 0;
      }

      if (innovation.collaborators?.length > 0) {
        points += subCategory.bonusPoints?.collaboration || 0;
      }

      totalPoints += points;

      if (innovation.approvedDate >= startOfMonth) {
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
 * @param {string} studentId
 * @param {string[]} collaboratorPRNs
 * @param {Set<string>} visited - prevent circular updates
 * @returns {Promise<Object>}
 */
async function updateStudentPoints(studentId, collaboratorPRNs , visited = new Set()) {
  if (visited.has(studentId.toString())) return;
  visited.add(studentId.toString());

  try {
    const { totalPoints, monthlyPoints } = await calculateStudentPoints(studentId);

    let studentPoints = await StudentPoints.findOne({ studentId });
    if (!studentPoints) studentPoints = new StudentPoints({ studentId });

    const approvedInnovations = await Innovation.find({
      $or: [
        { user: studentId },
        { collaborators: { $in: collaboratorPRNs } },
      ],
      status: { $in: ["FacultyApproved", "AdminApproved", "Implemented"] },
    });

    const pointCategories = await PointCategory.find();
    const categoryMap = Object.fromEntries(
      pointCategories.map((c) => [c.category, c])
    );

    studentPoints.achievements = [];

    for (const innovation of approvedInnovations) {
      const category = categoryMap[innovation.category];
      if (!category) continue;

      const subCategory = category.subCategories.find(
        (sub) =>
          sub.name.toLowerCase() ===
          (innovation.subCategory || "Participation").toLowerCase()
      );
      if (!subCategory) continue;

      let points = subCategory.basePoints;
      const statusMultiplier = subCategory.statusMultipliers[innovation.status] || 1;
      points *= statusMultiplier;

      if (innovation.recognition) {
        points += subCategory.bonusPoints?.recognition || 0;
      }

      if (innovation.collaborators?.length > 0) {
        points += subCategory.bonusPoints?.collaboration || 0;
      }

      studentPoints.achievements.push({
        category: innovation.category,
        subCategory: innovation.subCategory || "Participation",
        points,
        status: innovation.status,
        description: innovation.title,
        date: innovation.approvedDate || new Date(),
        recognition: !!innovation.recognition,
        collaboration: innovation.collaborators?.length > 0,
      });
    }

    studentPoints.totalPoints = totalPoints;
    studentPoints.monthlyPoints = monthlyPoints;
    studentPoints.lastUpdated = new Date();

    await studentPoints.save();

    // Recursively update collaborators
    for (const innovation of approvedInnovations) {
      if (innovation.collaborators?.length > 0) {
        for (const collaboratorPRN of innovation.collaborators) {
          const collaborator = await User.findOne({ PRN: collaboratorPRN });
          if (
            collaborator &&
            collaborator._id.toString() !== studentId.toString()
          ) {
            await updateStudentPoints(collaborator._id, collaboratorPRN, visited);
          }
        }
      }
    }

    return studentPoints;
  } catch (error) {
    console.error("Error updating student points:", error);
    throw error;
  }
}

/**
 * Update points for all students
 * @returns {Promise<{success: boolean, updatedCount: number, errors: Array}>}
 */
async function updateAllStudentPoints() {
  const result = {
    success: true,
    updatedCount: 0,
    errors: [],
  };

  try {
    const students = await User.find({ role: "student" });

    console.log(`Starting to update points for ${students.length} students`);

    const visited = new Set();

    const updatePromises = students.map(async (student) => {
      try {
        await updateStudentPoints(student._id,student.PRN, visited);
        result.updatedCount++;
        console.log(`Updated points for student: ${student.name} (${student._id})`);
      } catch (error) {
        console.error(`Error updating points for student ${student._id}:`, error);
        result.errors.push({
          studentId: student._id,
          studentName: student.name,
          error: error.message,
        });
        result.success = false;
      }
    });

    await Promise.all(updatePromises);

    console.log(
      `Completed updating points. Successfully updated ${result.updatedCount} out of ${students.length} students`
    );

    return result;
  } catch (error) {
    console.error("Error in updateAllStudentPoints:", error);
    result.success = false;
    result.errors.push({ error: error.message });
    return result;
  }
}

module.exports = {
  calculateStudentPoints,
  updateStudentPoints,
  updateAllStudentPoints,
};
