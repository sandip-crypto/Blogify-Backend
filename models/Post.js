const mongoose = require("mongoose")

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: [10, "Content must be at least 10 characters"],
    },
    excerpt: {
      type: String,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
    },
    coverImage: {
      type: String,
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    category: {
      type: String,
      trim: true,
      default: "Other",
    },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
    },
    views: {
      type: Number,
      default: 0,
    },
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
    commentsCount: {
      type: Number,
      default: 0,
    },
    readTime: {
      type: Number, // in minutes
      default: 1,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    publishedAt: {
      type: Date,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    seoTitle: {
      type: String,
      maxlength: [60, "SEO title cannot exceed 60 characters"],
    },
    seoDescription: {
      type: String,
      maxlength: [160, "SEO description cannot exceed 160 characters"],
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 })
postSchema.index({ status: 1, publishedAt: -1 })
postSchema.index({ tags: 1 })
postSchema.index({ category: 1 })
postSchema.index({ title: "text", content: "text" })


// Generate slug from title
postSchema.pre("save", function (next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50)
  }

  // Calculate read time
  if (this.isModified("content")) {
    const wordsPerMinute = 200
    const words = this.content.replace(/<[^>]*>/g, "").split(/\s+/).length
    this.readTime = Math.ceil(words / wordsPerMinute)

    // Generate excerpt if not provided
    if (!this.excerpt) {
      this.excerpt = this.content.replace(/<[^>]*>/g, "").substring(0, 150) + "..."
    }
  }

  // Set published date
  if (this.isModified("status") && this.status === "Published" && !this.publishedAt) {
    this.publishedAt = new Date()
  }

  next()
})

// Update likes count
postSchema.pre("save", function (next) {
  if (this.isModified("likes")) {
    this.likesCount = this.likes.length
  }
  next()
})

// Virtual for comments
postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "post",
})

module.exports = mongoose.model("Post", postSchema)
