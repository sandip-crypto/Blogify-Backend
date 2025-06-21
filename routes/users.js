const express = require("express")
const User = require("../models/User")
const Post = require("../models/Post")
const Comment = require("../models/Comment")
const { auth, adminOnly } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean()

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (!user.isActive) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("Get user error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(500).json({ message: "Server error fetching user" })
  }
})

// @route   GET /api/users/:id/posts
// @desc    Get user's published posts with stats
// @access  Public
router.get("/:id/posts", async (req, res) => {
  try {
    const { id } = req.params
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Check if user exists
    const user = await User.findById(id)
    if (!user || !user.isActive) {
      return res.status(404).json({ message: "User not found" })
    }

    // Get user's published posts
    const posts = await Post.find({
      author: id,
      status: "Published",
    })
      .populate("author", "name email avatar")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Get user stats
    const [totalPosts, totalViews, totalLikes] = await Promise.all([
      Post.countDocuments({ author: id, status: "Published" }),
      Post.aggregate([
        { $match: { author: user._id, status: "Published" } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]).then((result) => result[0]?.totalViews || 0),
      Post.aggregate([
        { $match: { author: user._id, status: "Published" } },
        { $group: { _id: null, totalLikes: { $sum: "$likesCount" } } },
      ]).then((result) => result[0]?.totalLikes || 0),
    ])

    const total = await Post.countDocuments({ author: id, status: "Published" })

    res.json({
      posts,
      stats: {
        totalPosts,
        totalViews,
        totalLikes,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Get user posts error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(500).json({ message: "Server error fetching user posts" })
  }
})

// @route   GET /api/user/posts
// @desc    Get current user's posts (including drafts)
// @access  Private
router.get("/posts", auth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const { status } = req.query

    const query = { author: req.user.id }
    if (status) {
      query.status = status
    }

    const posts = await Post.find(query)
      .populate("author", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Post.countDocuments(query)

    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Get user posts error:", error)
    res.status(500).json({ message: "Server error fetching posts" })
  }
})

// @route   GET /api/user/stats
// @desc    Get current user's statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user.id

    const [totalPosts, publishedPosts, draftPosts, totalViews, totalComments] = await Promise.all([
      Post.countDocuments({ author: userId }),
      Post.countDocuments({ author: userId, status: "Published" }),
      Post.countDocuments({ author: userId, status: "Draft" }),
      Post.aggregate([
        { $match: { author: userId, status: "Published" } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]).then((result) => result[0]?.totalViews || 0),
      Comment.countDocuments({ userId, isDeleted: false }),
    ])

    res.json({
      total: totalPosts,
      published: publishedPosts,
      drafts: draftPosts,
      views: totalViews,
      comments: totalComments,
    })
  } catch (error) {
    console.error("Get user stats error:", error)
    res.status(500).json({ message: "Server error fetching statistics" })
  }
})

// @route   GET /api/users/:id/comments
// @desc    Get user's comments
// @access  Public
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Check if user exists
    const user = await User.findById(id)
    if (!user || !user.isActive) {
      return res.status(404).json({ message: "User not found" })
    }

    const comments = await Comment.find({
      userId: id,
      isDeleted: false,
    })
      .populate("post", "title slug")
      .populate("userId", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Comment.countDocuments({ userId: id, isDeleted: false })

    res.json({
      comments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalComments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Get user comments error:", error)
    res.status(500).json({ message: "Server error fetching user comments" })
  }
})

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const { search, role, status } = req.query

    const query = {}

    if (search) {
      query.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }]
    }

    if (role) {
      query.role = role
    }

    if (status) {
      query.isActive = status === "active"
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean()

    const total = await User.countDocuments(query)

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error fetching users" })
  }
})

// @route   PUT /api/users/:id/status
// @desc    Update user status (Admin only)
// @access  Private/Admin
router.put("/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean value" })
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user,
    })
  } catch (error) {
    console.error("Update user status error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(500).json({ message: "Server error updating user status" })
  }
})

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private/Admin
router.put("/:id/role", auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be user or admin" })
    }

    // Prevent admin from changing their own role
    if (id === req.user.id) {
      return res.status(400).json({ message: "Cannot change your own role" })
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: `User role updated to ${role} successfully`,
      user,
    })
  } catch (error) {
    console.error("Update user role error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(500).json({ message: "Server error updating user role" })
  }
})

module.exports = router
