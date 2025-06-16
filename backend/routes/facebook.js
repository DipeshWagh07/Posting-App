import express from 'express';
import { 
  getFacebookPages, 
  getFacebookUserInfo, 
  postToFacebookPage, 
  postToFacebookTimeline,
  getFacebookPageInsights 
} from '../utils/facebookAuth.js';

const router = express.Router();

// Get user's Facebook pages - Support both authorization methods
router.get('/pages', async (req, res) => {
  let accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  // If not found in header, try to get from query params
  if (!accessToken) {
    accessToken = req.query.access_token;
  }

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    const pages = await getFacebookPages(accessToken);
    res.json({ pages });
  } catch (error) {
    console.error('Error fetching Facebook pages:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to retrieve Facebook pages' });
  }
});

// POST method for pages (for compatibility)
router.post('/pages', async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    const pages = await getFacebookPages(accessToken);
    res.json({ pages });
  } catch (error) {
    console.error('Error fetching Facebook pages:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to retrieve Facebook pages' });
  }
});

// Get user info
router.post('/userinfo', async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    const userInfo = await getFacebookUserInfo(accessToken);
    res.json({ userInfo });
  } catch (error) {
    console.error('Error fetching Facebook user info:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to retrieve user info' });
  }
});

// Post to Facebook page
router.post('/post', async (req, res) => {
  const { accessToken, pageId, message, imageUrl, link, picture } = req.body;

  if (!accessToken || !pageId || !message) {
    return res.status(400).json({ error: 'Access token, page ID, and message are required' });
  }

  try {
    // Get the page access token for the specific page
    const pages = await getFacebookPages(accessToken);
    const selectedPage = pages.find(page => page.id === pageId);
    
    if (!selectedPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const pageAccessToken = selectedPage.access_token;

    const result = await postToFacebookPage(pageAccessToken, pageId, {
      message,
      link: link || imageUrl,
      picture: picture || imageUrl
    });
    
    res.json({ 
      success: true, 
      postId: result.id,
      message: 'Successfully posted to Facebook page'
    });
  } catch (error) {
    console.error('Error posting to Facebook page:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to post to Facebook page',
      details: error.response?.data || error.message
    });
  }
});

// Alternative endpoint for posting (for compatibility)
router.post('/post-to-facebook', async (req, res) => {
  const { pageAccessToken, pageId, message, link, picture } = req.body;

  if (!pageAccessToken || !pageId || !message) {
    return res.status(400).json({ error: 'Page access token, page ID, and message are required' });
  }

  try {
    const result = await postToFacebookPage(pageAccessToken, pageId, {
      message,
      link,
      picture
    });
    
    res.json({ 
      success: true, 
      postId: result.id,
      message: 'Successfully posted to Facebook page'
    });
  } catch (error) {
    console.error('Error posting to Facebook page:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to post to Facebook page',
      details: error.response?.data || error.message
    });
  }
});

// Post to user's timeline
router.post('/post-timeline', async (req, res) => {
  const { accessToken, message, link, picture } = req.body;

  if (!accessToken || !message) {
    return res.status(400).json({ error: 'Access token and message are required' });
  }

  try {
    const result = await postToFacebookTimeline(accessToken, {
      message,
      link,
      picture
    });
    
    res.json({ 
      success: true, 
      postId: result.id,
      message: 'Successfully posted to Facebook timeline'
    });
  } catch (error) {
    console.error('Error posting to Facebook timeline:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to post to Facebook timeline',
      details: error.response?.data || error.message
    });
  }
});

// Get page insights/analytics
router.post('/page-insights', async (req, res) => {
  const { pageAccessToken, pageId } = req.body;

  if (!pageAccessToken || !pageId) {
    return res.status(400).json({ error: 'Page access token and page ID are required' });
  }

  try {
    const insights = await getFacebookPageInsights(pageAccessToken, pageId);
    res.json({ insights });
  } catch (error) {
    console.error('Error fetching Facebook page insights:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve page insights',
      details: error.response?.data || error.message
    });
  }
});

// Status check endpoint
router.get('/status', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!accessToken) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    await getFacebookUserInfo(accessToken);
    res.json({ authenticated: true });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

export default router;