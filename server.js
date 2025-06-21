const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")

// Import routes
const authRoutes = require("./routes/auth")
const postRoutes = require("./routes/posts")
const commentRoutes = require("./routes/comments")
const userRoutes = require("./routes/users")

// Load environment variables
dotenv.config()

const app = express()

// app.use(cors({
//   origin: 'http://localhost:5173',
//   credentials: true, // Optional: only if we're sending cookies or auth headers
// }));

// Middleware
// Allow Vercel domain
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/users", userRoutes)
app.use("/api/user", userRoutes) // For user-specific routes

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    message: "Blogify API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/blogify"
    await mongoose.connect(mongoURI)
    console.log("✅ MongoDB connected successfully")
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message)
    process.exit(1)
  }
}

// Start server
const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`)
    console.log(`🔗 API URL: http://localhost:${PORT}/api`)
  })
}

startServer()

module.exports = app
