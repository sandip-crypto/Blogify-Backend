const express = require("express")
const Post = require("../models/Post")
const Comment = require("../models/Comment")
const { auth, optionalAuth } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/posts
// @desc    Get all published posts with pagination and filtering
// @access  Public
router.get("/", optionalAuth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const { search, category, tags, author, sort } = req.query

    // Build query
    const query = { status: "Published" }

    if (search) {
      query.$text = { $search: search }
    }

    if (category) {
      query.category = new RegExp(category, "i")
    }

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim())
      query.tags = { $in: tagArray }
    }

    if (author) {
      query.author = author
    }

    // Build sort
    let sortQuery = {}
    switch (sort) {
      case "oldest":
        sortQuery = { publishedAt: 1 }
        break
      case "popular":
        sortQuery = { views: -1, likesCount: -1 }
        break
      case "trending":
        sortQuery = { likesCount: -1, commentsCount: -1, views: -1 }
        break
      default:
        sortQuery = { publishedAt: -1 }
    }

    const posts = await Post.find(query)
      .populate("author", "name email avatar bio")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Post.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Get posts error:", error)
    res.status(500).json({ message: "Server error fetching posts" })
  }
})

// @route   GET /api/posts/stats
// @desc    Get blog statistics
// @access  Public
router.get("/stats", async (req, res) => {
  try {
    const [postsCount, authorsCount, categoriesResult] = await Promise.all([
      Post.countDocuments({ status: "Published" }),
      Post.distinct("author", { status: "Published" }).then((authors) => authors.length),
      Post.aggregate([
        { $match: { status: "Published" } },
        { $unwind: "$tags" },
        { $group: { _id: null, uniqueTags: { $addToSet: "$tags" } } },
        { $project: { count: { $size: "$uniqueTags" } } },
      ]),
    ])

    res.json({
      posts: postsCount,
      authors: authorsCount,
      tags: categoriesResult[0]?.count || 0,
    })
  } catch (error) {
    console.error("Get stats error:", error)
    res.status(500).json({ message: "Server error fetching statistics" })
  }
})

// @route   GET /api/posts/featured
// @desc    Get featured posts
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const posts = await Post.find({
      status: "Published",
      featured: true,
    })
      .populate("author", "name email avatar")
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean()

    res.json(posts)
  } catch (error) {
    console.error("Get featured posts error:", error)
    res.status(500).json({ message: "Server error fetching featured posts" })
  }
})

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name email avatar bio website twitter linkedin")

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    // Check if user can view this post
    if (post.status !== "Published") {
      if (!req.user || (req.user.id !== post.author._id.toString() && req.user.role !== "admin")) {
        return res.status(404).json({ message: "Post not found" })
      }
    }

    // Increment view count (only for published posts and not the author)
    if (post.status === "Published" && (!req.user || req.user.id !== post.author._id.toString())) {
      post.views += 1
      await post.save()
    }

    res.json(post)
  } catch (error) {
    console.error("Get post error:", error)
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Post not found" })
    }
    res.status(500).json({ message: "Server error fetching post" })
  }
})

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { title, content, tags, category, coverImage, status, seoTitle, seoDescription } = req.body

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" })
    }

    const post = new Post({
      title: title.trim(),
      content,
      tags: tags || [],
      category: category || "Other",
      coverImage: coverImage || "",
      status: status || "Draft",
      author: req.user.id,
      seoTitle: seoTitle || "",
      seoDescription: seoDescription || "",
    })

    await post.save()
    await post.populate("author", "name email avatar")

    res.status(201).json({
      message: "Post created successfully",
      post,
    })
  } catch (error) {
    console.error("Create post error:", error)

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: errors.join(", ") })
    }

    res.status(500).json({ message: "Server error creating post" })
  }
})

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    // Check if user owns the post or is admin
    if (post.author.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" })
    }

    const { title, content, tags, category, coverImage, status, seoTitle, seoDescription } = req.body

    // Update fields
    if (title) post.title = title.trim()
    if (content) post.content = content
    if (tags !== undefined) post.tags = tags
    if (category) post.category = category
    if (coverImage !== undefined) post.coverImage = coverImage
    if (status) post.status = status
    if (seoTitle !== undefined) post.seoTitle = seoTitle
    if (seoDescription !== undefined) post.seoDescription = seoDescription

    await post.save()
    await post.populate("author", "name email avatar")

    res.json({
      message: "Post updated successfully",
      post,
    })
  } catch (error) {
    console.error("Update post error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Post not found" })
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: errors.join(", ") })
    }

    res.status(500).json({ message: "Server error updating post" })
  }
})

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    // Check if user owns the post or is admin
    if (post.author.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" })
    }

    // Delete associated comments
    await Comment.deleteMany({ post: post._id })

    // Delete the post
    await Post.findByIdAndDelete(req.params.id)

    res.json({ message: "Post deleted successfully" })
  } catch (error) {
    console.error("Delete post error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Post not found" })
    }

    res.status(500).json({ message: "Server error deleting post" })
  }
})

// @route   POST /api/posts/:id/like
// @desc    Like/Unlike a post
// @access  Private
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    const existingLike = post.likes.find((like) => like.user.toString() === req.user.id)

    if (existingLike) {
      // Unlike the post
      post.likes = post.likes.filter((like) => like.user.toString() !== req.user.id)
    } else {
      // Like the post
      post.likes.push({ user: req.user.id })
    }

    await post.save()

    res.json({
      message: existingLike ? "Post unliked" : "Post liked",
      likesCount: post.likesCount,
      liked: !existingLike,
    })
  } catch (error) {
    console.error("Like post error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Post not found" })
    }

    res.status(500).json({ message: "Server error liking post" })
  }
})

// @route   GET /api/posts/:id/related
// @desc    Get related posts
// @access  Public
router.get("/:id/related", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    const relatedPosts = await Post.find({
      _id: { $ne: post._id },
      status: "Published",
      $or: [{ tags: { $in: post.tags } }, { category: post.category }, { author: post.author }],
    })
      .populate("author", "name email avatar")
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean()

    res.json(relatedPosts)
  } catch (error) {
    console.error("Get related posts error:", error)
    res.status(500).json({ message: "Server error fetching related posts" })
  }
})

module.exports = router
