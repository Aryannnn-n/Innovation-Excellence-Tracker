const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const session = require("express-session");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ["faculty", "student", "admin"],
    default: "student",
  },
});

const InnovationSchema = new mongoose.Schema({
  title: String,
  category: String,
  description: String,
  contributors: [String],
  department: String,
  date: Date,
  status: { type: String, enum: ["pending", "approved"], default: "pending" },
});

const User = mongoose.model("User", UserSchema);
const Innovation = mongoose.model("Innovation", InnovationSchema);


app.get('/', async (req, res) => {
  // let innovations = await await Innovation.find();
  // console.log(innovations); 
  res.render('index', { user: req.session.user });
});

app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  const { name, email, password, role, department } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("register", { error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department,
    });
    await newUser.save();

    res.redirect("/login");
  } catch (error) {
    res.render("register", { error: "Error registering user" });
  }
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render("login", { error: "Invalid credentials" });
  }

  req.session.user = user;
  res.redirect("/dashboard");
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const user = req.session.user;

  // Student Dashboard: Can add innovations & view all students' entries
  if (user.role === "student") {
    const innovations = await Innovation.find(); // Show all submissions
    return res.render("dashboard", { user, innovations });
  }

  // Faculty Dashboard: Can accept or reject student data
  if (user.role === "faculty") {
    const pendingInnovations = await Innovation.find({ status: "pending" }); // Show only pending submissions
    return res.render("facultyDashboard", { user, pendingInnovations });
  }

  // Admin Dashboard: Can edit, delete, and manage all data
  if (user.role === "admin") {
    const innovations = await Innovation.find(); // Show all submissions
    return res.render("dashboard_admin", { user, innovations });
  }

  // Default case (if role is not recognized)
  res.redirect("/login");
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const innovations = await Innovation.find();
  res.render("dashboard", { user: req.session.user, innovations });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Hello

app.post("/innovation/new", async (req, res) => {
  if (!req.session.user || req.session.user.role === "student") {
    return res.redirect("/dashboard");
  }
  const innovation = new Innovation(req.body);
  await innovation.save();
  res.redirect("/dashboard");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
