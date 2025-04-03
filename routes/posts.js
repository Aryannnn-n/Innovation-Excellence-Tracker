const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Post = require("../models/post");
const { isAuthenticated } = require("../middleware/auth");

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/posts";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    // Check if the file is an image by checking the mimetype
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// Configure multer for attachments
const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/attachments";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Create a new post
router.post(
  "/create",
  isAuthenticated,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        authorName,
        authorRole,
        authorId,
        category,
        tags,
        visibility,
        department,
        isAnnouncement,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Please upload an image" });
      }

      // Parse tags if they're provided as a comma-separated string
      const parsedTags = tags ? tags.split(",").map((tag) => tag.trim()) : [];

      const newPost = new Post({
        title,
        description,
        image: req.file.filename,
        authorName,
        authorRole,
        authorId,
        category: category || "General",
        tags: parsedTags,
        visibility: visibility || "public",
        department: department || "All",
        isAnnouncement: isAnnouncement === "true",
      });

      await newPost.save();

      res.redirect("/posts");
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all posts with filtering
router.get("/", async (req, res) => {
  try {
    const {
      category,
      tag,
      department,
      author,
      search,
      sort = "newest",
    } = req.query;

    let query = {};

    // Apply filters
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (department && department !== "All") query.department = department;
    if (author) query.authorId = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Determine sort order
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "mostLiked") sortOption = { "likes.length": -1 };
    if (sort === "mostCommented") sortOption = { "comments.length": -1 };

    const posts = await Post.find(query)
      .populate("comments.user", "name")
      .populate("comments.replies.user", "name")
      .sort(sortOption);

    // Get unique categories and tags for filtering
    const categories = await Post.distinct("category");
    const allTags = await Post.distinct("tags");
    const departments = [
      "All",
      "CSE",
      "ECE",
      "Mechanical",
      "Civil",
      "Biotech",
      "Others",
    ];

    res.render("posts", {
      posts,
      user: req.session.user || null,
      categories,
      allTags,
      departments,
      filters: { category, tag, department, author, search, sort },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Like a post
router.post("/like/:postId", isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user already liked the post
    const likeIndex = post.likes.indexOf(req.session.user._id);

    if (likeIndex === -1) {
      // Add like
      post.likes.push(req.session.user._id);
    } else {
      // Remove like
      post.likes.splice(likeIndex, 1);
    }

    await post.save();

    res.json({ likes: post.likes.length });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a comment to a post
router.post("/comment/:postId", isAuthenticated, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      user: req.session.user._id,
      text,
    });

    await post.save();

    res.redirect("/posts");
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Like a comment
router.post(
  "/comment/:postId/like/:commentId",
  isAuthenticated,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = post.comments.id(req.params.commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Initialize likes array if it doesn't exist
      if (!comment.likes) {
        comment.likes = [];
      }

      // Check if user already liked the comment
      const likeIndex = comment.likes.indexOf(req.session.user._id);

      if (likeIndex === -1) {
        // Add like
        comment.likes.push(req.session.user._id);
      } else {
        // Remove like
        comment.likes.splice(likeIndex, 1);
      }

      await post.save();

      res.json({ likes: comment.likes.length });
    } catch (error) {
      console.error("Error liking comment:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add a reply to a comment
router.post(
  "/comment/:postId/reply/:commentId",
  isAuthenticated,
  async (req, res) => {
    try {
      const { text } = req.body;
      const post = await Post.findById(req.params.postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = post.comments.id(req.params.commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Initialize replies array if it doesn't exist
      if (!comment.replies) {
        comment.replies = [];
      }

      comment.replies.push({
        user: req.session.user._id,
        text,
      });

      await post.save();

      res.redirect("/posts");
    } catch (error) {
      console.error("Error adding reply:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add attachment to a post
router.post(
  "/:postId/attachment",
  isAuthenticated,
  uploadAttachment.single("file"),
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Please upload a file" });
      }

      post.attachments.push({
        filename: req.file.originalname,
        path: req.file.filename,
      });

      await post.save();

      res.redirect("/posts");
    } catch (error) {
      console.error("Error adding attachment:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Pin/unpin a post (admin/faculty only)
router.post("/:postId/pin", isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is admin or faculty
    if (
      req.session.user.role !== "admin" &&
      req.session.user.role !== "faculty"
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.redirect("/posts");
  } catch (error) {
    console.error("Error pinning post:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a post (admin/faculty or post author only)
router.delete("/:postId", isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is admin, faculty, or the post author
    if (
      req.session.user.role !== "admin" &&
      req.session.user.role !== "faculty" &&
      post.authorId.toString() !== req.session.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Post.findByIdAndDelete(req.params.postId);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
