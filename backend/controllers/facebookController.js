import axios from 'axios';
import {
  getFacebookAuthUrl,
  getFacebookAccessToken,
  getFacebookPages,
  getFacebookUserInfo,
  postToFacebookPage,
  verifyFacebookToken
} from "../utils/facebookAuth.js";

// Environment variables
const CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || "1057966605784043";
const CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || "d84933382c363ca71fcb146268ff0cdc";
const FRONTEND_REDIRECT = process.env.FRONTEND_REDIRECT_URI || "http://localhost:3000";

// Helper function for consistent error responses
const createErrorResponse = (error, defaultMessage = "An error occurred") => {
  const fbError = error.response?.data?.error || {};
  return {
    error: fbError.message || error.message || defaultMessage,
    code: fbError.code || "UNKNOWN_ERROR",
    fbtrace_id: fbError.fbtrace_id,
    details: error.details,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
};

export const startFacebookAuth = (req, res) => {
  try {
    const { state } = req.query;
    const authUrl = getFacebookAuthUrl(state);
    res.json({ 
      authUrl,
      expiresIn: 3600 // 1 hour validity
    });
  } catch (error) {
    console.error("Auth URL generation error:", error);
    res.status(500).json(createErrorResponse(error, "Failed to generate auth URL"));
  }
};

export const facebookCallback = async (req, res) => {
  const { code, error: fbError, error_reason: errorReason, state } = req.query;

  if (fbError) {
    console.error('Facebook OAuth error:', { fbError, errorReason, state });
    return res.redirect(
      `${FRONTEND_REDIRECT}/auth-error?provider=facebook&error=${encodeURIComponent(errorReason || 'unknown')}&state=${state || ''}`
    );
  }

  if (!code) {
    return res.status(400).json(createErrorResponse(new Error("Authorization code not provided")));
  }

  try {
    // 1. First get the access token
    const userAccessToken = await getFacebookAccessToken(code);
    
    // 2. Then get user info and pages in parallel
    const [userInfo, pages] = await Promise.all([
      getFacebookUserInfo(userAccessToken),
      getFacebookPages(userAccessToken)
    ]);

    // Verify token is valid before proceeding
    const tokenInfo = await verifyFacebookToken(userAccessToken);
    if (!tokenInfo.is_valid) {
      throw new Error("Invalid access token received from Facebook");
    }

    const redirectUrl = new URL(`${FRONTEND_REDIRECT}/dashboard`);
    redirectUrl.searchParams.set('platform', 'facebook');
    redirectUrl.searchParams.set('accessToken', userAccessToken);
    redirectUrl.searchParams.set('userId', userInfo.id);
    redirectUrl.searchParams.set('userName', encodeURIComponent(userInfo.name));
    if (state) redirectUrl.searchParams.set('state', state);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Facebook authentication failed:", error);
    res.redirect(
      `${FRONTEND_REDIRECT}/auth-error?provider=facebook&error=${encodeURIComponent(error.message)}&state=${state || ''}`
    );
  }
};

export const handleFacebookCodeExchange = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json(createErrorResponse(new Error("Missing authorization code")));
  }

  try {
    // 1. First get the access token
    const userAccessToken = await getFacebookAccessToken(code);
    
    // 2. Then get user info and pages in parallel
    const [userInfo, pages] = await Promise.all([
      getFacebookUserInfo(userAccessToken),
      getFacebookPages(userAccessToken)
    ]);

    res.json({
      success: true,
      accessToken: userAccessToken,
      userInfo,
      pages: pages.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        canPost: p.canPost
      }))
    });
  } catch (error) {
    console.error("Facebook token exchange failed:", error);
    res.status(500).json(createErrorResponse(error, "Token exchange failed"));
  }
};

export const handleFacebookPost = async (req, res) => {
  try {
    const { userAccessToken, pageId, message, imageUrl } = req.body;

    if (!userAccessToken || !pageId) {
      return res.status(400).json(createErrorResponse(new Error("userAccessToken and pageId are required")));
    }

    // Get pages and verify access
    const pages = await getFacebookPages(userAccessToken);
    const page = pages.find(p => p.id === pageId);

    if (!page) {
      return res.status(404).json({
        error: "Page not found",
        availablePages: pages.map(p => ({ id: p.id, name: p.name }))
      });
    }

    if (!page.access_token) {
      return res.status(403).json(createErrorResponse(new Error("No access token for this page")));
    }

    // Debug token info (logged but not exposed to client)
    try {
      const debugInfo = await verifyFacebookToken(page.access_token);
      console.log('[DEBUG] Token info:', {
        isValid: debugInfo.is_valid,
        scopes: debugInfo.scopes,
        expiresAt: debugInfo.expires_at
      });
    } catch (debugError) {
      console.warn('[DEBUG] Token verification failed:', debugError.message);
    }

    // Create the post
    const result = await postToFacebookPage(page.access_token, pageId, {
      message,
      imageUrl
    });

    res.json({
      success: true,
      postId: result.id,
      type: result.type || 'post'
    });

  } catch (error) {
    console.error('[DEBUG] Facebook post error:', error);

    // Handle specific Facebook errors
    if (error.response?.data?.error?.code === 368) {
      return res.status(429).json({
        error: "Temporarily blocked by Facebook",
        details: "Please wait 24-48 hours before trying again",
        code: "TEMPORARY_BLOCK"
      });
    }

    res.status(500).json(createErrorResponse(error, "Failed to create post"));
  }
};

export const getFacebookUserPages = async (req, res) => {
  try {
    const { userAccessToken } = req.body;

    if (!userAccessToken) {
      return res.status(400).json(createErrorResponse(new Error("Missing user access token")));
    }

    const pages = await getFacebookPages(userAccessToken);

    res.json({
      success: true,
      pages: pages.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        canPost: p.canPost,
        hasAccessToken: !!p.access_token
      }))
    });
  } catch (error) {
    console.error("Failed to get Facebook pages:", error);
    res.status(500).json(createErrorResponse(error, "Failed to get Facebook pages"));
  }
};

export const debugFacebookPageAccess = async (req, res) => {
  try {
    const { userAccessToken, pageId } = req.body;

    if (!userAccessToken || !pageId) {
      return res.status(400).json(createErrorResponse(new Error("Missing required fields")));
    }

    const pages = await getFacebookPages(userAccessToken);
    const page = pages.find(p => p.id === pageId);

    if (!page) {
      return res.status(404).json({
        error: "Page not found",
        availablePages: pages.map(p => ({ id: p.id, name: p.name }))
      });
    }

    // Verify page token
    let tokenInfo = {};
    try {
      tokenInfo = await verifyFacebookToken(page.access_token);
    } catch (tokenError) {
      console.warn("Token verification failed:", tokenError.message);
    }

    res.json({
      success: true,
      debugInfo: {
        pageId: page.id,
        pageName: page.name,
        hasValidToken: tokenInfo.is_valid === true,
        tokenExpiresAt: tokenInfo.expires_at,
        permissions: page.tasks || [],
        category: page.category
      }
    });
  } catch (error) {
    console.error("Debug failed:", error);
    res.status(500).json(createErrorResponse(error, "Debug failed"));
  }
};