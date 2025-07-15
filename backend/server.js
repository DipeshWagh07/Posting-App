import express from "express";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { fileURLToPath } from "url";
import { URLSearchParams } from 'url';
import path from "path";
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import dotenv from "dotenv";
dotenv.config();

// Import models and utilities
import ScheduledPost from "./models/ScheduledPost.js";
import { initScheduler } from "./utils/scheduler.js";

// Controller imports
import {
  upload,
  uploadImage,
  createPost,
} from "./controllers/instagramController.js";
import {
  startLinkedInAuth,
  linkedInCallback,
  handleCodeExchange,
  getLinkedInUserInfo,
  createLinkedInPost
} from "./controllers/linkedinController.js";
import {
  startFacebookAuth,
  facebookCallback,
  handleFacebookCodeExchange,
  handleFacebookPost,
  getFacebookUserPages,
  debugFacebookPageAccess,
  getFacebookPageTokens ,
  createFacebookPostWithFile
} from "./controllers/facebookController.js";
import {
  startYouTubeAuth,
  youtubeCallback,
  handleYouTubeCodeExchange,
  uploadVideoEndpoint,
  getYouTubeChannelInfoEndpoint
} from "./controllers/youtubeController.js";
import {
  initializeAuth,
  handleCallback,
  handleCallbackPost,
  postTweet,
  getProfile,
  postThread,
  disconnect,
} from "./controllers/twitterXController.js";
import {
  uploadTikTokVideo,
  createTikTokPost
} from "./controllers/tiktokController.js";

// Route imports
import facebookRoutes from "./routes/facebook.js";
import linkedinRoutes from "./routes/linkedIn.js";
import twitterRoutes from "./routes/twitterX.js";

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  initScheduler(); // Initialize the scheduler after DB connection
});

// Middleware
app.use(express.json());
app.use(bodyParser.json());
// Update your session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // change to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },

    name: "tiktok.oauth.session"
  })
);

app.use(cors({
  origin: [
    "https://postingapp-g0p1.onrender.com",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-open-id"]
}));

const port = process.env.PORT || 8000;

// Configure multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
 
// Middleware for debugging
app.use((req, res, next) => {
  if (req.url.includes("twitter")) {
    console.log(`${req.method} ${req.url}`, req.query);
  }
  next();
});

app.use("/uploads", express.static("uploads"));

// ============ ROUTES ============

// Authentication Routes
app.get("/auth/linkedin", startLinkedInAuth);
app.get("/auth/linkedin/callback", linkedInCallback);
app.post("/auth/linkedin/exchange", handleCodeExchange);
app.post("/linkedin/userinfo", getLinkedInUserInfo);
app.post("/api/post-to-linkedin", createLinkedInPost);

app.get("/auth/facebook", startFacebookAuth);
app.get("/auth/facebook/callback", facebookCallback);
app.post("/auth/facebook/exchange", handleFacebookCodeExchange);
app.get("/api/facebook/page-tokens", getFacebookPageTokens);

app.get("/auth/youtube", startYouTubeAuth);
app.get("/auth/youtube/callback", youtubeCallback);
app.post("/auth/youtube/exchange", handleYouTubeCodeExchange);
app.post("/youtube/channel-info", getYouTubeChannelInfoEndpoint);

app.get("/auth/twitter", initializeAuth);
app.get("/auth/twitter/callback", handleCallback);
app.post("/auth/twitter/callback", handleCallbackPost);

// API Routes
app.post("/api/facebook/create-post", upload.single("file"), createFacebookPostWithFile);
app.post("/api/facebook/pages", getFacebookUserPages);
app.post("/api/facebook/debug", debugFacebookPageAccess);

app.use("/api/facebook", facebookRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/twitter", twitterRoutes);

app.post("/api/instagram/upload", upload.single("file"), uploadImage);
app.post("/api/instagram/post", createPost);

app.post("/api/upload-youtube-video", uploadVideoEndpoint);

// TikTok Routes
const pkceStore = new Map();

const generatePKCE = () => {
  const verifier = crypto.randomBytes(32).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const challenge = crypto.createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
};

app.get('/auth/tiktok', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const { verifier, challenge } = generatePKCE();
    
    pkceStore.set(state, verifier);

    const authUrl = `https://www.tiktok.com/v2/auth/authorize?${new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      scope: 'video.upload',
      response_type: 'code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    })}`;

    res.json({ authUrl, state });
  } catch (error) {
    console.error('TikTok auth init error:', error);
    res.status(500).json({ error: 'Failed to initialize TikTok auth' });
  }
});

app.get('/auth/tiktok/callback', async (req, res) => {
  try {
        console.log('TikTok callback received'); // Debug log

    const { code, state, error } = req.query;
        console.log('Callback params:', { code, state, error }); // Debug log

    if (error) {
      throw new Error(`TikTok error: ${error}`);
    }

        // Verify state
    const verifier = pkceStore.get(state);
    if (!verifier) {
      throw new Error('Invalid or expired state parameter');
    }

        // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token',
      new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
        code_verifier: verifier
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        }
      }
    );

    const { access_token, open_id } = tokenResponse.data;
    res.redirect(`${process.env.FRONTEND_URL}/tiktok-callback?access_token=${access_token}&open_id=${open_id}`);

  } catch (error) {
    console.error('TikTok callback error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/tiktok-callback#error=${encodeURIComponent(error.message)}`);
  }
});

app.post('/api/tiktok/upload', upload.single('video'), uploadTikTokVideo);
app.post('/api/tiktok/post', createTikTokPost);

// Scheduled Posts Routes
// Update your GET /api/scheduled-posts endpoint
app.get('/api/scheduled-posts', async (req, res) => {
  try {
    console.log('Fetching scheduled posts...'); // Debug log
    
    // Add proper error handling and query parameters
    const posts = await ScheduledPost.find({
      $or: [
        { status: 'pending' },
        { status: 'processing' }
      ]
    })
    .sort({ scheduledTime: 1 })
    .lean(); // Convert to plain JS objects
    
    console.log('Found posts:', posts); // Debug log
    
    // Transform data for frontend
    const transformedPosts = posts.map(post => ({
      ...post,
      id: post._id,
      scheduledTime: new Date(post.scheduledTime).toISOString()
    }));
    
    res.json(transformedPosts);
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scheduled posts',
      details: error.message 
    });
  }
});

app.post('/api/schedule-post', upload.single('file'), async (req, res) => {
  try {
    console.log('Received schedule request:', req.body); // Debug log
    
    const { text, platforms, platformTokens, selectedFacebookPageId, scheduledTime } = req.body;
    
    // Validate required fields
    if (!text || !platforms || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      console.log('File uploaded:', fileUrl); // Debug log
    }

    // Parse and validate platforms
    const parsedPlatforms = JSON.parse(platforms);
    if (Object.keys(parsedPlatforms).length === 0) {
      return res.status(400).json({ error: 'No platforms selected' });
    }

    // Create new post document
    const newPost = new ScheduledPost({
      text,
      fileUrl,
      platforms: parsedPlatforms,
      platformTokens: platformTokens ? JSON.parse(platformTokens) : {},
      selectedFacebookPageId: selectedFacebookPageId || null,
      scheduledTime: new Date(scheduledTime),
      status: 'pending'
    });

    console.log('Creating post:', newPost); // Debug log
    
    // Save to database
    const savedPost = await newPost.save();
    console.log('Post saved:', savedPost); // Debug log

    // Schedule the post
    await schedulePost(savedPost);

    // Return transformed data
    res.status(201).json({
      ...savedPost.toObject(),
      id: savedPost._id,
      scheduledTime: new Date(savedPost.scheduledTime).toISOString()
    });
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ 
      error: 'Failed to schedule post',
      details: error.message 
    });
  }
});

app.delete('/api/scheduled-posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPost = await ScheduledPost.findByIdAndDelete(id);
    
    if (!deletedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

app.post('/api/process-scheduled-post', upload.single('file'), async (req, res) => {
  try {
    const { text, platforms, platformTokens, selectedFacebookPageId } = req.body;
    const file = req.file;

    const parsedPlatforms = JSON.parse(platforms);
    const parsedTokens = JSON.parse(platformTokens);

    // Process each platform
    if (parsedPlatforms.facebook || parsedPlatforms.instagram) {
      const selectedPage = parsedTokens.facebook_pages?.find(page => page.id === selectedFacebookPageId);
      
      if (selectedPage) {
        if (parsedPlatforms.facebook) {
          const formData = new FormData();
          formData.append("message", text);
          if (file) formData.append("source", file);

          await axios.post(
            `https://graph.facebook.com/v18.0/${selectedPage.id}/photos`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${selectedPage.accessToken}`,
              },
            }
          );
        }

        if (parsedPlatforms.instagram && selectedPage.instagramAccount) {
          await axios.post(`${API_BASE_URL}/api/instagram/post`, {
            pageAccessToken: selectedPage.accessToken,
            instagramUserId: selectedPage.instagramAccount.id,
            caption: text,
            imageUrl: file ? `/uploads/${file.filename}` : null
          });
        }
      }
    }

    if (parsedPlatforms.linkedin && parsedTokens.linkedin) {
      await axios.post(`${API_BASE_URL}/api/post-to-linkedin`, {
        accessToken: parsedTokens.linkedin,
        text: text,
        userUrn: parsedTokens.linkedin_user_urn
      });
    }

    if (parsedPlatforms.youtube && parsedTokens.youtube && file?.mimetype.startsWith("video/")) {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", text);

      await axios.post(
        `${API_BASE_URL}/api/upload-youtube-video`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    }

    if (parsedPlatforms.tiktok && parsedTokens.tiktok && file?.mimetype.startsWith("video/")) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accessToken', parsedTokens.tiktok);
      formData.append('openId', parsedTokens.tiktok_open_id);
      
      const uploadResponse = await axios.post(
        `${API_BASE_URL}/api/tiktok/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      await axios.post(
        `${API_BASE_URL}/api/tiktok/post`,
        {
          accessToken: parsedTokens.tiktok,
          openId: parsedTokens.tiktok_open_id,
          caption: text,
          videoId: uploadResponse.data.videoId
        }
      );
    }

    if (parsedPlatforms.twitterX && parsedTokens.twitterX) {
      await axios.post(
        `${API_BASE_URL}/api/twitter/post`,
        { content: text },
        { withCredentials: true }
      );
    }

    if (parsedPlatforms.whatsapp && parsedTokens.whatsapp) {
      await axios.post(
        `${API_BASE_URL}/api/whatsapp/post`,
        { message: text },
        { headers: { Authorization: `Bearer ${parsedTokens.whatsapp}` } }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing scheduled post:', error);
    res.status(500).json({ 
      error: 'Failed to process scheduled post',
      details: error.response?.data || error.message
    });
  }
});

// Add this test route temporarily
app.get('/api/test-posts', async (req, res) => {
  const testPost = new ScheduledPost({
    text: "TEST POST - DELETE ME",
    platforms: { linkedin: true },
    scheduledTime: new Date(Date.now() + 3600000) // 1 hour from now
  });
  await testPost.save();
  res.json(await ScheduledPost.find());
});

// In your server.js, ensure MongoDB connection is properly established
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Add this before your routes in server.js
mongoose.set('debug', function(coll, method, query, doc) {
  console.log(`MongoDB: ${coll}.${method}`, {
    query: query,
    doc: doc
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("✅ Social Media Dashboard Backend is Live!");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});