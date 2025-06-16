import {
  getFacebookAuthUrl,
  getFacebookAccessToken,
  getFacebookPages,
  getFacebookUserInfo,
  postToFacebookPage,
} from "../utils/facebookAuth.js";

export const startFacebookAuth = (req, res) => {
  const authUrl = getFacebookAuthUrl();
  res.redirect(authUrl);
};

// GET callback from Facebook
export const facebookCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code not provided.");
  }

  try {
    const userAccessToken = await getFacebookAccessToken(code);
    const userInfo = await getFacebookUserInfo(userAccessToken);
    const pages = await getFacebookPages(userAccessToken);

    // Store pages with their access tokens for later use
    // You might want to store this in a database or session

    // Redirect to frontend with user data (adjust URL for production)
    const redirectUrl = `http://localhost:3000/dashboard?platform=facebook&accessToken=${userAccessToken}&userId=${
      userInfo.id
    }&userName=${encodeURIComponent(userInfo.name)}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Facebook authentication failed:", err);
    res.status(500).send("Failed to authenticate with Facebook.");
  }
};

// POST endpoint for frontend to exchange code for access token
export const handleFacebookCodeExchange = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code." });
  }

  try {
    const userAccessToken = await getFacebookAccessToken(code);
    const userInfo = await getFacebookUserInfo(userAccessToken);
    const pages = await getFacebookPages(userAccessToken);

    res.json({
      accessToken: userAccessToken,
      userInfo,
      pages,
    });
  } catch (err) {
    console.error(
      "Facebook token exchange failed:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Token exchange failed." });
  }
};

export const handleFacebookPost = async (req, res) => {
    try {
      const { userAccessToken, pageId, message, imageUrl } = req.body;
  
      // Ensure pageId is string for comparison
      const stringPageId = String(pageId);
      console.log(`[DEBUG] Looking for page ID: ${stringPageId}`);
  
      // Get pages with debug info
      const pages = await getFacebookPages(userAccessToken);
      console.log('[DEBUG] Available pages:', pages);
  
      // In handleFacebookPost controller
      const page = pages.find(p => p.id === pageId);
      if (!page?.access_token) {
        throw new Error("No page access token available");
      }
  
      // Find page with strict string comparison
      const targetPage = pages.find(page => {
        const match = String(page.id) === stringPageId;
        console.log(`[DEBUG] Comparing ${page.id} (${page.name}) -> ${match}`);
        return match;
      });
  
      if (!targetPage) {
        console.log('[DEBUG] Page not found in available pages:', {
          requestedId: stringPageId,
          availableIds: pages.map(p => p.id)
        });
        return res.status(404).json({
          error: "Page not found in your accessible pages",
          requestedPageId: stringPageId,
          availablePages: pages.map(p => ({ id: p.id, name: p.name }))
        });
      }
  
      if (!targetPage.access_token) {
        console.log('[DEBUG] No access token for page:', targetPage.name);
        return res.status(403).json({
          error: "No access token for this page",
          solution: "Re-authenticate with Facebook and ensure all permissions are granted"
        });
      }
  
      // Debug the page token
      try {
        const debug = await axios.get(`https://graph.facebook.com/debug_token`, {
          params: {
            input_token: targetPage.access_token,
            access_token: `${clientId}|${clientSecret}`
          }
        });
        console.log('[DEBUG] Token debug info:', debug.data);
      } catch (debugError) {
        console.warn('[DEBUG] Token debug failed:', debugError.message);
      }
  
      // Prepare post data
      const postData = { message, ...(imageUrl && { picture: imageUrl }) };
  
      // Make the post
      // Use the page's access token, not the user's
      const result = await postToFacebookPage(page.access_token, pageId, postData);
  
      return res.json({ success: true, postId: result.id });
  
    } catch (error) {
      console.error('[DEBUG] Full post error:', {
        message: error.message,
        facebookError: error.response?.data?.error,
        stack: error.stack
      });
  
      // Handle specific Facebook errors
      const fbError = error.response?.data?.error;
      if (fbError?.code === 368) {
        return res.status(429).json({
          error: "Temporarily blocked by Facebook",
          details: "You've been temporarily blocked from posting. Please wait 24-48 hours before trying again.",
          facebookError: fbError.message,
          suggestion: "Try posting different content and space out your posts more."
        });
      }
  
      return res.status(500).json({
        error: "Failed to create post",
        details: fbError?.message || error.message,
        code: fbError?.code
      });
    }
  };

// Helper endpoint to get available pages for a user
export const getFacebookUserPages = async (req, res) => {
  try {
    const { userAccessToken } = req.body;

    if (!userAccessToken) {
      return res.status(400).json({ error: "Missing user access token." });
    }

    const pages = await getFacebookPages(userAccessToken);

    // Return simplified page info
    const pageList =
      pages.data?.map((page) => ({
        id: page.id,
        name: page.name,
        category: page.category,
        hasAccessToken: !!page.access_token,
        tasks: page.tasks || [],
      })) || [];

    res.json({
      success: true,
      pages: pageList,
    });
  } catch (err) {
    console.error("Failed to get Facebook pages:", err);
    res.status(500).json({
      error: "Failed to get Facebook pages",
      details: err.message,
    });
  }
};

// Debug endpoint to test page access
export const debugFacebookPageAccess = async (req, res) => {
  try {
    const { userAccessToken, pageId } = req.body;

    if (!userAccessToken || !pageId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Get pages to find the specific page's access token
    const pages = await getFacebookPages(userAccessToken);
    const targetPage = pages.data?.find((page) => page.id === pageId);

    if (!targetPage) {
      return res.status(404).json({
        error: "Page not found",
        availablePages: pages.data?.map((p) => ({ id: p.id, name: p.name })),
      });
    }

    const debugInfo = {
      pageId: targetPage.id,
      pageName: targetPage.name,
      hasPageAccessToken: !!targetPage.access_token,
      permissions: targetPage.tasks || [],
      category: targetPage.category,
    };

    res.json({
      success: true,
      debugInfo,
    });
  } catch (err) {
    console.error("Debug failed:", err);
    res.status(500).json({
      error: "Debug failed",
      details: err.message,
    });
  }
};
