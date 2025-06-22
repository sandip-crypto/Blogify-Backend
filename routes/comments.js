const express = require("express")
const Comment = require("../models/Comment")
const Post = require("../models/Post")
const { auth } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/comments/:postId
// @desc    Get all comments for a post
// @access  Public
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    // Check if post exists
    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    const comments = await Comment.find({
      post: postId,
      isDeleted: false,
      parentComment: null, // Only get top-level comments
    })
      .populate("userId", "name email avatar")
      .populate({
        path: "replies",
        populate: {
          path: "userId",
          select: "name email avatar",
        },
        match: { isDeleted: false },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Comment.countDocuments({
      post: postId,
      isDeleted: false,
      parentComment: null,
    })

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
    console.error("Get comments error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Invalid post ID" })
    }

    res.status(500).json({ message: "Server error fetching comments" })
  }
})

// @route   POST /api/comments/:postId
// @desc    Add a comment to a post
// @access  Private
router.post("/:postId", auth, async (req, res) => {
  try {
    const { postId } = req.params
    const { comment, parentComment } = req.body

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" })
    }

    // Check if post exists and is published
    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    if (post.status !== "Published") {
      return res.status(400).json({ message: "Cannot comment on unpublished posts" })
    }

    // If it's a reply, check if parent comment exists
    if (parentComment) {
      const parentCommentDoc = await Comment.findById(parentComment)
      if (!parentCommentDoc || parentCommentDoc.post.toString() !== postId) {
        return res.status(400).json({ message: "Invalid parent comment" })
      }
    }

    const newComment = new Comment({
      comment: comment.trim(),
      post: postId,
      userId: req.user.id,
      parentComment: parentComment || null,
    })

    await newComment.save()
    await newComment.populate("userId", "name email avatar")

    // If it's a reply, add to parent's replies array
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: newComment._id },
      })
    }

    res.status(201).json(newComment)
  } catch (error) {
    console.error("Add comment error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Invalid post ID" })
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: errors.join(", ") })
    }

    res.status(500).json({ message: "Server error adding comment" })
  }
})

// @route   PUT /api/comments/:commentId
// @desc    Update a comment
// @access  Private
router.put("/:commentId", auth, async (req, res) => {
  try {
    const { commentId } = req.params
    const { comment } = req.body

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" })
    }

    const existingComment = await Comment.findById(commentId)

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    if (existingComment.isDeleted) {
      return res.status(400).json({ message: "Cannot edit deleted comment" })
    }

    // Check if user owns the comment
    if (existingComment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    existingComment.comment = comment.trim()
    await existingComment.save()
    await existingComment.populate("userId", "name email avatar")

    res.json({
      message: "Comment updated successfully",
      comment: existingComment,
    })
  } catch (error) {
    console.error("Update comment error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Invalid comment ID" })
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: errors.join(", ") })
    }

    res.status(500).json({ message: "Server error updating comment" })
  }
})

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete("/:commentId", auth, async (req, res) => {
  try {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    // Check if user owns the comment or is admin
    if (comment.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" })
    }

    // Soft delete - mark as deleted instead of removing
    comment.isDeleted = true
    comment.deletedAt = new Date()
    comment.comment = "[This comment has been deleted]"
    await comment.save()

    res.json({ message: "Comment deleted successfully" })
  } catch (error) {
    console.error("Delete comment error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Invalid comment ID" })
    }

    res.status(500).json({ message: "Server error deleting comment" })
  }
})

// @route   POST /api/comments/:commentId/like
// @desc    Like/Unlike a comment
// @access  Private
router.post("/:commentId/like", auth, async (req, res) => {
  try {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    if (comment.isDeleted) {
      return res.status(400).json({ message: "Cannot like deleted comment" })
    }

    const existingLike = comment.likes.find((like) => like.user.toString() === req.user.id)

    if (existingLike) {
      // Unlike the comment
      comment.likes = comment.likes.filter((like) => like.user.toString() !== req.user.id)
    } else {
      // Like the comment
      comment.likes.push({ user: req.user.id })
    }

    await comment.save()

    res.json({
      message: existingLike ? "Comment unliked" : "Comment liked",
      likesCount: comment.likesCount,
      liked: !existingLike,
    })
  } catch (error) {
    console.error("Like comment error:", error)

    if (error.name === "CastError") {
      return res.status(404).json({ message: "Invalid comment ID" })
    }

    res.status(500).json({ message: "Server error liking comment" })
  }
})

// @route   GET /api/comments/user/:userId
// @desc    Get all comments by a user
// @access  Public
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const comments = await Comment.find({
      userId,
      isDeleted: false,
    })
      .populate("post", "title slug")
      .populate("userId", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Comment.countDocuments({ userId, isDeleted: false })

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

module.exports = router
