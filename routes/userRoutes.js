const express = require("express")
const Post = require("../models/Post")
const Comment = require("../models/Comment")
const { auth } = require("../middleware/auth")

const router = express.Router()

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

module.exports = router
