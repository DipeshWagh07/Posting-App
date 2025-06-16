import express from "express";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";

// Route imports
import facebookRoutes from "./routes/facebook.js";
import linkedinRoutes from "./routes/linkedIn.js";
import twitterRoutes from "./routes/twitterX.js";

// Controller imports
import {
  startLinkedInAuth,
  linkedInCallback,
  handleCodeExchange,
} from "./controllers/linkedinController.js";
import {
  startFacebookAuth,
  facebookCallback,
  handleFacebookCodeExchange,
  handleFacebookPost,
  getFacebookUserPages,
  debugFacebookPageAccess,
} from "./controllers/facebookController.js";
import {
  startYouTubeAuth,
  youtubeCallback,
  handleYouTubeCodeExchange,
  uploadVideoEndpoint,
  getYouTubeChannelInfo,
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
import twitterXAuth from "./utils/twitterXAuth.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
  if (req.url.includes('twitter')) {
    console.log(`${req.method} ${req.url}`, req.query);
  }
  next();
});
app.use(express.json());
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true, // Change this to true
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Add this for better compatibility
  },
  name: 'twitter.oauth.session' // Add a specific session name
}));
app.use((req, res, next) => {
  if (req.url.includes('twitter')) {
    console.log(`${req.method} ${req.url}`, {
      sessionId: req.sessionID,
      session: {
        oauth_token: req.session.oauth_token ? 'Present' : 'Missing',
        oauth_token_secret: req.session.oauth_token_secret ? 'Present' : 'Missing',
        twitter_access_token: req.session.twitter_access_token ? 'Present' : 'Missing'
      }
    });
  }
  next();
});
app.use("/uploads", express.static("uploads"));

// ============ AUTHENTICATION ROUTES ============

// LinkedIn Auth Routes
app.get("/auth/linkedin", startLinkedInAuth);
app.get("/auth/linkedin/callback", linkedInCallback);
app.post("/auth/linkedin/exchange", handleCodeExchange);

// Facebook Auth Routes
app.get("/auth/facebook", startFacebookAuth); // Server-side OAuth start
app.get("/auth/facebook/callback", facebookCallback); // Server-side OAuth callback
app.post("/auth/facebook/exchange", handleFacebookCodeExchange); // Client-side code exchange

// YouTube Auth Routes
app.get("/auth/youtube", startYouTubeAuth);
app.get("/auth/youtube/callback", youtubeCallback);
app.post("/auth/youtube/exchange", handleYouTubeCodeExchange);

// Twitter X Auth Routes
app.get("/auth/twitter", initializeAuth);
app.get("/auth/twitter/callback", handleCallback); // This handles the redirect from Twitter
app.post("/auth/twitter/callback", handleCallbackPost); // This handles POST requests if needed
// ============ API ROUTES ============

// Facebook API Routes
app.post("/api/facebook/post", handleFacebookPost);
app.post("/api/facebook/pages", getFacebookUserPages);
app.post("/api/facebook/debug", debugFacebookPageAccess);

// Use route files
app.use("/api/facebook", facebookRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/twitter", twitterRoutes);

// ============ FILE UPLOAD SETUP ============
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// File Upload Endpoints
app.post("/api/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl });
});

app.post("/api/upload-youtube-video", uploadVideoEndpoint);

// ============ LEGACY ENDPOINTS (for backward compatibility) ============

// LinkedIn User Info & Post
app.post("/linkedin/userinfo", async (req, res) => {
  const { accessToken } = req.body;

  try {
    const response = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const { sub } = response.data;
    res.json({ sub });
  } catch (err) {
    console.error(
      "Failed to fetch userinfo:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to get user info" });
  }
});

app.post("/api/post-to-linkedin", async (req, res) => {
  try {
    const { accessToken, text, userUrn, imageUrl } = req.body;

    if (!accessToken || !userUrn) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // If there's an imageUrl, we need to download it and upload to LinkedIn
    let imagePath = null;
    if (imageUrl) {
      try {
        // Download the image from your server
        const imageResponse = await axios.get(imageUrl, {
          responseType: "stream",
        });

        // Save temporarily
        const tempPath = `uploads/temp-${Date.now()}.jpg`;
        const writer = fs.createWriteStream(tempPath);
        imageResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        imagePath = tempPath;
      } catch (downloadError) {
        console.error("Failed to download image:", downloadError);
        // Continue without image
      }
    }

    // Use the LinkedIn routes handler
    const linkedinResponse = await axios.post(
      "http://localhost:8000/api/linkedin/post",
      {
        accessToken,
        text,
        userUrn,
        imagePath,
      }
    );

    // Clean up temp file
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json(linkedinResponse.data);
  } catch (error) {
    console.error(
      "Error posting to LinkedIn:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "Failed to post to LinkedIn",
      details: error.response?.data || error.message,
    });
  }
});

// YouTube Info Endpoint
app.post("/youtube/channel-info", async (req, res) => {
  const { accessToken } = req.body;

  try {
    const channelInfo = await getYouTubeChannelInfo(accessToken);
    res.json({ channelInfo });
  } catch (error) {
    console.error("Error getting YouTube channel info:", error);
    res.status(500).json({ error: "Failed to get channel info" });
  }
});

// ============ START SERVER ============
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
