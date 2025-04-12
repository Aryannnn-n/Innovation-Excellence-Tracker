const express = require("express");
const router = express.Router();
const Innovation = require("../models/innovation");
const User = require("../models/user");
const Hackathon = require("../models/hackathon");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const Notification = require("../models/notification");

// multer setup
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Use the original name of the file
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// router.get("/register", (req, res) => {
//   res.render("auth/register", { error: null });
// });

router.post("/register", async (req, res) => {
  const { name, email, password, role, department , PRN } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("auth/login", { error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department,
      PRN 
    });
    let registeredUSer = await newUser.save();
    let curreUser = await User.findOne({_id: req.session.user})

    curreUser.registrations.push(registeredUSer);
    await curreUser.save();

    res.redirect("/user/login");
  } catch (error) {
    res.render("auth/studentRegister", { error: "Error registering user" });
  }
});

router.get("/login", (req, res) => {
  res.render("auth/login", { error: null });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render("auth/login", { error: "Invalid credentials" });
  }

  req.session.user = user;
  res.redirect("/user/dashboard");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// dashboard after login
router.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/user/login");

  // const user = req.session.user;
  const user = await User.findOne({_id: req.session.user._id}).populate("registrations");
  // console.log(user);

  try {
    if (user.role === "student") {
      // Show all innovation submissions to students
      const notifications = await Notification.find({ userId: user._id }).sort({
        createdAt: -1,
      });

      // Fetch innovations where the user is either the owner or a collaborator
      const innovations = await Innovation.find({
        $or: [{ user: user._id }, { collaborators: user.PRN }],
      });

      return res.render("dashboards/dashboard", {
        user,
        innovations,
        notifications,
      });
    }

    if (user.role === "faculty") {
      // Fetch all proposals and categorize them
      const allProposals = await Innovation.find({department: user.department});
      const pendingProposals = allProposals.filter(
        (p) => p.status === "pending"
      );
      const approvedProposals = allProposals.filter(
        (p) =>
          p.status === "FacultyApproved" ||
          p.status === "AdminApproved" ||
          p.status === "Implemented"
      );
      const rejectedProposals = allProposals.filter(
        (p) => p.status === "rejected"
      );
      // let User = await User.findOne({_id: user._id }).populate("registrations");
      // user = user.populate("user");
      // console.log(user.registrations);

      return res.render("dashboards/dashboard_faculty", {
        user,
        pendingProposals,
        approvedProposals,
        rejectedProposals,
      });
    }

    if (user.role === "admin") {
      // Admin sees all proposals and can manage them
      const innovations = await Innovation.find({
        status: { $in: ["FacultyApproved", "AdminApproved", "Implemented"] },
      });
      const hackathons = await Hackathon.find(); // Fetch all hackathons
      return res.render("dashboards/dashboard_admin", {
        user,
        innovations,
        hackathons,
      });
    }

    // If user role is unknown, redirect to login
    res.redirect("/user/login");
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Cancel admission route
// Cancel admission route
// router.post('/admission/cancel/:regId', async (req, res) => {
//   const userId = req.session.user._id;
//   const regId = req.params.regId;

//   try {
//     const mainUser = await User.findOne({ _id: userId });

//     const registration = mainUser.registrations.find(
//       (reg) => reg._id.toString() === regId
//     );

//     if (!registration) {
//       return res.status(404).send('Registration not found.');
//     }

//     const registeredUserId = registration.user?._id || registration.user;

//     console.log("🧾 User to delete:", registeredUserId);

//     if (!registeredUserId) {
//       return res.status(400).send('No user ID found in registration.');
//     }

//     // Remove registration
//     mainUser.registrations = mainUser.registrations.filter(
//       (reg) => reg._id.toString() !== regId
//     );
//     await mainUser.save();

//     // Double-check user exists before deleting
//     const userToDelete = await User.findById(registeredUserId);
//     if (!userToDelete) {
//       console.warn("⚠️ User not found with ID:", registeredUserId);
//     } else {
//       await User.deleteOne({ _id: registeredUserId });
//       console.log("✅ User deleted:", registeredUserId);
//     }

//     res.redirect('/user/dashboard');
//   } catch (err) {
//     console.error("❌ Error cancelling registration and removing user:", err);
//     res.status(500).send("Internal Server Error");
//   }
// });




// Cancel admission route
router.post('/admission/cancel/:regId', async (req, res) => {
  const userId = req.session.user._id;
  const regId = req.params.regId;

  try {
    const mainUser = await User.findById(userId);

    // Step 1: Find the registration with that regId
    const registration = mainUser.registrations.find(
      (r) => r._id.toString() === regId
    );

    if (!registration) {
      return res.status(404).send("Registration not found.");
    }

    const registeredUserId = registration._id;
    // console.log(registeredUserId)

    // Step 2: Remove the registration
    mainUser.registrations = mainUser.registrations.filter(
      (reg) => reg._id.toString() !== regId
    );
    await mainUser.save();
    // Step 3: Delete the registered user
    await User.deleteOne({ _id: registeredUserId });

    res.redirect('/user/dashboard');
  } catch (err) {
    console.error("Error cancelling registration:", err);
    res.status(500).send("Internal Server Error");
  }
});



module.exports = router;
