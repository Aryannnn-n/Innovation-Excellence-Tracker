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
const StudentPoints = require('./models/StudentPoints');

const session = require('express-session');
const flash = require('connect-flash');


const app = express();


app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  // res.locals.error = req.flash('error'); // used by passport sometimes
  next();
});

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// multer setup
// Ensure the uploads directory exists
const fs = require('fs'); // ✅ Import fs module
const uploadDir = path.join(__dirname, 'uploads');
const postsUploadDir = path.join(__dirname, 'public/uploads/posts');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(postsUploadDir)) {
  fs.mkdirSync(postsUploadDir, { recursive: true });
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



app.use('/uploads', express.static('uploads'));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const userRouter = require('./routes/user'); //router part
const facultyRouter = require('./routes/faculty');
const adminRouter = require('./routes/admin');
const studentRouter = require('./routes/student');
const postsRouter = require('./routes/posts');
const leaderboardRoutes = require('./routes/leaderboard');
const PointCategory = require('./models/PointCategory');

app.use('/user', userRouter);
app.use('/faculty', facultyRouter);
app.use('/admin', adminRouter);
app.use('/student', studentRouter);
app.use('/posts', postsRouter);
app.use('/leaderboard', leaderboardRoutes);

app.get('/', async (req, res) => {
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    // console.log(adminUser)
    if (adminUser == null) {
      res.render('auth/adminRegister');
    }
    const topStudents = await StudentPoints.find()
      .sort({ totalPoints: -1 })
      .limit(3)
      .populate('studentId', 'name email');
    // console.log(topStudents)
    const hackathons = await Hackathon.find().sort({ date: 1 }).limit(5);

    res.render('index', {
      user: req.user,
      topStudents: topStudents || [],
      hackathons: hackathons || [],
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.render('index', {
      user: req.user,
      topStudents: [],
      hackathons: [],
    });
  }
});


// app.get("/getflash",(req,res)=>{
//   let mess = req.flash("succes","welcome")
//   res.redirect("/show");
// })
// app.get("/show",(req,res)=>{
//   res.status(300).send(req.flash("succes"))
// })
// The student total proposals data
app.get('/user/category-count', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(400).json({ error: 'User not logged in' });
    }

    const userId = new mongoose.Types.ObjectId(req.session.user._id); // ✅ Convert session user ID to ObjectId
    const userPRN =  await User.findOne({PRN: req.session.user.PRN});
    const categoryCount = await Innovation.aggregate([
      { $match: {$or:[{ user: userId } ,{_id:{ $in: userPRN.innovations } }]}}, // ✅ Filter innovations by logged-in user
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

// Chatbot route
const chatBot = require('./services/ai.service');

app.post('/get-res-chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required',
      });
    }

    const response = await chatBot(prompt);

    if (!response) {
      throw new Error('AI service returned empty response');
    }

    res.status(200).json({
      success: true,
      message: response.toString(), // Ensure string output
    });
  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'AI service unavailable',
      error: error.stack, // For debugging
    });
  }
});

// Rating Route'
const aiRating = require('./services/aiRating.service');

app.get('/get-rating', async (req, res) => {
  const prompt = req.query.prompt;
  // console.log(prompt);

  if (!prompt) {
    return res.status(400).send('Prompt is req');
  }

  const response = await aiRating(prompt);
  res.send(response);
});

app.get('/admin/category-count', async (req, res) => {
  try {
    const categoryCount = await Innovation.aggregate([
      { $match: { status: 'approved' } }, // ✅ Filter innovations by logged-in user
      {
        $group: {
          _id: '$category', // ✅ Group by category
          count: { $sum: 1 }, // ✅ Count innovations per category
        },
      },
    ]);
    const departmentWiseCount = await Innovation.aggregate([
      {
        $group: {
          _id: '$department', // ✅ Group by department
          totalInnovations: { $sum: 1 }, // ✅ Count total innovations in each department
        },
      },
      { $sort: { _id: 1 } }, // ✅ Sort by department name
    ]);

    res.json({ categoryCount, departmentWiseCount });
  } catch (error) {
    console.error('Aggregation Error:', error);
    res.status(500).json({ error: 'Failed to fetch category counts' });
  }
});

// Initialize point categories
PointCategory.initializeDefaults().catch(console.error);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
