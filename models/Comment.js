const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      minlength: [1, "Comment must be at least 1 character"],
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
commentSchema.index({ post: 1, createdAt: -1 })
commentSchema.index({ userId: 1, createdAt: -1 })
commentSchema.index({ parentComment: 1 })

// Update likes count
commentSchema.pre("save", function (next) {
  if (this.isModified("likes")) {
    this.likesCount = this.likes.length
  }

  if (this.isModified("comment") && !this.isNew) {
    this.isEdited = true
    this.editedAt = new Date()
  }

  next()
})

// Update post's comment count when comment is saved
commentSchema.post("save", async function () {
  const Post = mongoose.model("Post")
  const commentCount = await mongoose.model("Comment").countDocuments({
    post: this.post,
    isDeleted: false,
  })
  await Post.findByIdAndUpdate(this.post, { commentsCount: commentCount })
})

// Update post's comment count when comment is removed
commentSchema.post("remove", async function () {
  const Post = mongoose.model("Post")
  const commentCount = await mongoose.model("Comment").countDocuments({
    post: this.post,
    isDeleted: false,
  })
  await Post.findByIdAndUpdate(this.post, { commentsCount: commentCount })
})

module.exports = mongoose.model("Comment", commentSchema)
