const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

// database file setup
const Innovation = require('./models/innovation');
const User = require('./models/user');
const Hackathon = require('./models/hackathon');

const session = require('express-session');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '/public')));

// multer setup
// Ensure the uploads directory exists
const fs = require('fs'); // ✅ Import fs module
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Use the original name of the file
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use('/uploads', express.static('uploads'));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const userRouter = require('./routes/user'); //router part
const facultyRouter = require('./routes/faculty');
const adminRouter = require('./routes/admin');
const studentRouter = require('./routes/student');

app.use('/user', userRouter);
app.use('/faculty', facultyRouter);
app.use('/admin', adminRouter);
app.use('/student', studentRouter);

app.get('/', async (req, res) => {
  const hackathons = await Hackathon.find(); // Fetch from DB
  res.render('utils/index', { user: req.session.user, hackathons });
});

// The student total proposals data
app.get('/category-count', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(400).json({ error: 'User not logged in' });
    }

    const userId = new mongoose.Types.ObjectId(req.session.user._id); // ✅ Convert session user ID to ObjectId

    const categoryCount = await Innovation.aggregate([
      { $match: { user: userId } }, // ✅ Filter innovations by logged-in user
      {
        $group: {
          _id: '$category', // ✅ Group by category
          count: { $sum: 1 }, // ✅ Count innovations per category
        },
      },
    ]);

    res.json(categoryCount);
  } catch (error) {
    console.error('Aggregation Error:', error);
    res.status(500).json({ error: 'Failed to fetch category counts' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
