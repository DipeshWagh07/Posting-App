import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// TikTok OAuth Routes
app.get('/auth/tiktok', (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const authUrl = `https://www.tiktok.com/v2/auth/authorize?${new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      scope: 'user.info.basic,video.upload',
      response_type: 'code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      state: state,
    })}`;

    // Store state in cookie
    res.cookie('tiktok_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600000 // 10 minutes
    });

    // Redirect directly instead of returning JSON
    res.redirect(authUrl);
  } catch (error) {
    console.error('TikTok auth init error:', error);
    res.status(500).json({ error: 'Failed to initialize TikTok auth' });
  }
});

app.post('/auth/tiktok/exchange', async (req, res) => {
  try {
    const { code, state } = req.body;
    const savedState = req.cookies.tiktok_auth_state;
    
    // Validate state
    if (!state || state !== savedState) {
      return res.status(400).json({ 
        error: 'Invalid state parameter' 
      });
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        }
      }
    );

    // Set tokens in secure cookies
    res.cookie('tiktok_access_token', tokenResponse.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenResponse.data.expires_in * 1000
    });

    res.cookie('tiktok_open_id', tokenResponse.data.open_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenResponse.data.expires_in * 1000
    });

    // Optionally store refresh token if needed
    if (tokenResponse.data.refresh_token) {
      res.cookie('tiktok_refresh_token', tokenResponse.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }

    res.json({
      success: true,
      open_id: tokenResponse.data.open_id,
      expires_in: tokenResponse.data.expires_in
    });
  } catch (error) {
    console.error('TikTok token exchange error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to exchange TikTok code',
      details: error.response?.data || error.message
    });
  }
});

app.post('/api/tiktok/upload', upload.single('file'), async (req, res) => {
  try {
    const accessToken = req.cookies.tiktok_access_token;
    const openId = req.cookies.tiktok_open_id;

    if (!accessToken || !openId) {
      return res.status(401).json({ 
        error: "Authentication required" 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: "No video file uploaded" 
      });
    }

    const form = new FormData();
    form.append('video', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const uploadResponse = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/inbox/video/upload/',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${accessToken}`,
          'x-open-id': openId
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    res.json({
      success: true,
      videoId: uploadResponse.data.data.video_id,
    });
  } catch (error) {
    console.error('Video upload error:', error.response?.data || error.message);
    
    // Handle token expiration
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Token expired or invalid',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload video',
      details: error.response?.data || error.message
    });
  }
});

app.post('/api/tiktok/post', async (req, res) => {
  try {
    const accessToken = req.cookies.tiktok_access_token;
    const openId = req.cookies.tiktok_open_id;
    const { caption, videoId } = req.body;

    if (!accessToken || !openId) {
      return res.status(401).json({ 
        error: "Authentication required" 
      });
    }

    if (!videoId) {
      return res.status(400).json({ 
        error: "Video ID required" 
      });
    }

    const response = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/inbox/video/publish/',
      {
        post_info: {
          caption: caption || '',
          video_cover_timestamp_ms: 1000,
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false
        },
        source_info: {
          source: "PULL_FROM_FILE",
          video_id: videoId
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-open-id': openId,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      postId: response.data.data.publish_id,
      shareUrl: response.data.data.share_url
    });
  } catch (error) {
    console.error('Post creation error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create post',
      details: error.response?.data || error.message
    });
  }
});

app.post('/auth/tiktok/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.tiktok_refresh_token;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: "Refresh token missing" 
      });
    }

    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Set new tokens in cookies
    res.cookie('tiktok_access_token', response.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: response.data.expires_in * 1000
    });

    res.cookie('tiktok_open_id', response.data.open_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: response.data.expires_in * 1000
    });

    res.json({
      success: true,
      expires_in: response.data.expires_in
    });
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to refresh token',
      details: error.response?.data || error.message
    });
  }
});

app.get('/auth/tiktok/check', (req, res) => {
  const accessToken = req.cookies.tiktok_access_token;
  const openId = req.cookies.tiktok_open_id;
  
  res.json({
    authenticated: !!accessToken && !!openId
  });
});

app.get('/auth/tiktok/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies.tiktok_auth_state;
    
    // Validate state
    if (!state || state !== savedState) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=invalid_state`);
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        }
      }
    );

    // Set tokens in cookies
    res.cookie('tiktok_access_token', tokenResponse.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenResponse.data.expires_in * 1000
    });

    res.cookie('tiktok_open_id', tokenResponse.data.open_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenResponse.data.expires_in * 1000
    });

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}?auth=success`);
  } catch (error) {
    console.error('TikTok callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

app.post('/auth/tiktok/logout', (req, res) => {
  // Clear TikTok auth cookies
  res.clearCookie('tiktok_access_token');
  res.clearCookie('tiktok_open_id');
  res.clearCookie('tiktok_refresh_token');
  
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});