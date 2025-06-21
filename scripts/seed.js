"use client"

const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const dotenv = require("dotenv")
const User = require("../models/User")
const Post = require("../models/Post")
const Comment = require("../models/Comment")

dotenv.config()

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/blogify")
    console.log("✅ Connected to MongoDB")

    // Clear existing data
    await User.deleteMany({})
    await Post.deleteMany({})
    await Comment.deleteMany({})
    console.log("🗑️  Cleared existing data")

    // Create sample users
    const users = [
      {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        bio: "Full-stack developer passionate about web technologies and sharing knowledge.",
        website: "https://johndoe.dev",
        twitter: "johndoe",
        role: "admin",
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        password: "password123",
        bio: "Frontend developer and UI/UX enthusiast. Love creating beautiful user experiences.",
        website: "https://janesmith.design",
        linkedin: "https://linkedin.com/in/janesmith",
      },
      {
        name: "Mike Johnson",
        email: "mike@example.com",
        password: "password123",
        bio: "Backend developer specializing in Node.js and database optimization.",
        twitter: "mikejohnson",
      },
      {
        name: "Sarah Wilson",
        email: "sarah@example.com",
        password: "password123",
        bio: "Tech writer and developer advocate. Helping developers learn and grow.",
        website: "https://sarahwrites.tech",
      },
    ]

    const createdUsers = await User.create(users)
    console.log("👥 Created sample users")

    // Create sample posts
    const posts = [
      {
        title: "Getting Started with React Hooks",
        content: `
          <h2>Introduction to React Hooks</h2>
          <p>React Hooks revolutionized the way we write React components. In this comprehensive guide, we'll explore the most commonly used hooks and how they can simplify your React development.</p>
          
          <h3>What are React Hooks?</h3>
          <p>Hooks are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 and have become the preferred way to write React components.</p>
          
          <h3>useState Hook</h3>
          <p>The useState hook allows you to add state to functional components. Here's a simple example:</p>
          
          <pre><code>
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
          </code></pre>
          
          <h3>useEffect Hook</h3>
          <p>The useEffect hook lets you perform side effects in function components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined.</p>
          
          <h3>Best Practices</h3>
          <ul>
            <li>Only call hooks at the top level of your React function</li>
            <li>Don't call hooks inside loops, conditions, or nested functions</li>
            <li>Use the ESLint plugin for hooks to catch common mistakes</li>
          </ul>
          
          <p>React Hooks have made functional components much more powerful and are now the recommended approach for new React applications.</p>
        `,
        author: createdUsers[0]._id,
        tags: ["react", "javascript", "hooks", "frontend"],
        category: "Web Development",
        status: "Published",
        coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        views: 245,
        featured: true,
      },
      {
        title: "Building RESTful APIs with Node.js and Express",
        content: `
          <h2>Creating Robust APIs</h2>
          <p>Building a well-structured RESTful API is crucial for modern web applications. In this tutorial, we'll create a complete API using Node.js and Express.</p>
          
          <h3>Setting Up the Project</h3>
          <p>First, let's initialize our project and install the necessary dependencies:</p>
          
          <pre><code>
npm init -y
npm install express mongoose cors dotenv
npm install -D nodemon
          </code></pre>
          
          <h3>Creating the Server</h3>
          <p>Let's start by creating a basic Express server with proper middleware setup.</p>
          
          <h3>Database Models</h3>
          <p>We'll use Mongoose to define our data models and interact with MongoDB.</p>
          
          <h3>Route Handlers</h3>
          <p>Implementing CRUD operations with proper error handling and validation.</p>
          
          <h3>Authentication & Authorization</h3>
          <p>Adding JWT-based authentication to secure our API endpoints.</p>
          
          <p>By the end of this tutorial, you'll have a production-ready API that follows REST conventions and best practices.</p>
        `,
        author: createdUsers[2]._id,
        tags: ["nodejs", "express", "api", "backend", "mongodb"],
        category: "Backend Development",
        status: "Published",
        coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800",
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        views: 189,
      },
      {
        title: "CSS Grid vs Flexbox: When to Use Which",
        content: `
          <h2>Understanding CSS Layout Systems</h2>
          <p>CSS Grid and Flexbox are both powerful layout systems, but they serve different purposes. Let's explore when to use each one.</p>
          
          <h3>CSS Grid</h3>
          <p>CSS Grid is a two-dimensional layout system that excels at creating complex layouts with rows and columns.</p>
          
          <h4>Best Use Cases for Grid:</h4>
          <ul>
            <li>Complex page layouts</li>
            <li>Card-based designs</li>
            <li>Magazine-style layouts</li>
            <li>Any layout requiring precise positioning</li>
          </ul>
          
          <h3>Flexbox</h3>
          <p>Flexbox is a one-dimensional layout system that's perfect for distributing space and aligning items.</p>
          
          <h4>Best Use Cases for Flexbox:</h4>
          <ul>
            <li>Navigation bars</li>
            <li>Centering content</li>
            <li>Equal height columns</li>
            <li>Component-level layouts</li>
          </ul>
          
          <h3>Can They Work Together?</h3>
          <p>Grid and Flexbox complement each other perfectly. Use Grid for the overall page layout and Flexbox for component-level arrangements.</p>
          
          <p>The key is understanding that Grid is for layout and Flexbox is for alignment and distribution.</p>
        `,
        author: createdUsers[1]._id,
        tags: ["css", "grid", "flexbox", "layout", "frontend"],
        category: "Design",
        status: "Published",
        coverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        views: 156,
      },
      {
        title: "The Future of Web Development",
        content: `
          <h2>Emerging Trends and Technologies</h2>
          <p>The web development landscape is constantly evolving. Let's explore the trends that will shape the future of our industry.</p>
          
          <h3>WebAssembly (WASM)</h3>
          <p>WebAssembly is enabling near-native performance in web browsers, opening up new possibilities for web applications.</p>
          
          <h3>Edge Computing</h3>
          <p>Moving computation closer to users for better performance and reduced latency.</p>
          
          <h3>AI Integration</h3>
          <p>Machine learning and AI are becoming more accessible to web developers through various APIs and frameworks.</p>
          
          <h3>Progressive Web Apps</h3>
          <p>PWAs continue to blur the line between web and native applications.</p>
          
          <h3>Serverless Architecture</h3>
          <p>Function-as-a-Service platforms are changing how we think about backend development.</p>
          
          <p>Staying current with these trends will help you build better, more efficient web applications.</p>
        `,
        author: createdUsers[3]._id,
        tags: ["webdev", "future", "trends", "technology"],
        category: "Technology",
        status: "Published",
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        views: 98,
      },
      {
        title: "Draft: Advanced TypeScript Patterns",
        content: `
          <h2>Mastering TypeScript</h2>
          <p>This is a draft post about advanced TypeScript patterns and techniques.</p>
          
          <h3>Generic Constraints</h3>
          <p>Learn how to use generic constraints to create more flexible and type-safe code.</p>
          
          <h3>Conditional Types</h3>
          <p>Exploring conditional types and how they can help create more dynamic type definitions.</p>
          
          <p>More content coming soon...</p>
        `,
        author: createdUsers[0]._id,
        tags: ["typescript", "advanced", "patterns"],
        category: "Programming",
        status: "Draft",
        views: 0,
      },
    ]

    const createdPosts = await Post.create(posts)
    console.log("📝 Created sample posts")

    // Create sample comments
    const comments = [
      {
        comment: "Great explanation of React Hooks! This really helped me understand the concept better.",
        post: createdPosts[0]._id,
        userId: createdUsers[1]._id,
      },
      {
        comment: "Thanks for sharing this. The useState example was particularly helpful.",
        post: createdPosts[0]._id,
        userId: createdUsers[2]._id,
      },
      {
        comment: "Could you do a follow-up post on custom hooks?",
        post: createdPosts[0]._id,
        userId: createdUsers[3]._id,
      },
      {
        comment: "Excellent tutorial! The step-by-step approach makes it easy to follow.",
        post: createdPosts[1]._id,
        userId: createdUsers[0]._id,
      },
      {
        comment: "I've been struggling with API design. This post cleared up a lot of confusion.",
        post: createdPosts[1]._id,
        userId: createdUsers[1]._id,
      },
      {
        comment: "Finally! Someone who explains the difference clearly. Grid vs Flexbox was always confusing.",
        post: createdPosts[2]._id,
        userId: createdUsers[3]._id,
      },
      {
        comment: "The examples really help visualize when to use each layout system.",
        post: createdPosts[2]._id,
        userId: createdUsers[0]._id,
      },
      {
        comment: "Fascinating insights into the future of web development. WebAssembly looks promising!",
        post: createdPosts[3]._id,
        userId: createdUsers[1]._id,
      },
    ]

    await Comment.create(comments)
    console.log("💬 Created sample comments")

    // Update posts with like data
    await Post.findByIdAndUpdate(createdPosts[0]._id, {
      $push: {
        likes: [{ user: createdUsers[1]._id }, { user: createdUsers[2]._id }, { user: createdUsers[3]._id }],
      },
    })

    await Post.findByIdAndUpdate(createdPosts[1]._id, {
      $push: {
        likes: [{ user: createdUsers[0]._id }, { user: createdUsers[3]._id }],
      },
    })

    await Post.findByIdAndUpdate(createdPosts[2]._id, {
      $push: {
        likes: [
          { user: createdUsers[0]._id },
          { user: createdUsers[1]._id },
          { user: createdUsers[2]._id },
          { user: createdUsers[3]._id },
        ],
      },
    })

    console.log("❤️  Added sample likes")

    console.log("\n🎉 Database seeded successfully!")
    console.log("\n📊 Sample Data Created:")
    console.log(`👥 Users: ${createdUsers.length}`)
    console.log(`📝 Posts: ${createdPosts.length}`)
    console.log(`💬 Comments: ${comments.length}`)
    console.log("\n🔐 Sample Login Credentials:")
    console.log("Admin: john@example.com / password123")
    console.log("User: jane@example.com / password123")
    console.log("User: mike@example.com / password123")
    console.log("User: sarah@example.com / password123")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding database:", error)
    process.exit(1)
  }
}

seedData()
