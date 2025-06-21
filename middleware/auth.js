const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    const user = await User.findById(decoded.id).select("-password")

    if (!user) {
      return res.status(401).json({ message: "Token is not valid. User not found." })
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated." })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." })
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." })
    }
    console.error("Auth middleware error:", error)
    res.status(500).json({ message: "Server error in authentication." })
  }
}

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
      const user = await User.findById(decoded.id).select("-password")

      if (user && user.isActive) {
        req.user = user
      }
    }

    next()
  } catch (error) {
    // Continue without user if token is invalid
    next()
  }
}

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    res.status(403).json({ message: "Access denied. Admin privileges required." })
  }
}

module.exports = { auth, optionalAuth, adminOnly }
