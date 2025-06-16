import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const clientId = "2056002844893910";
const clientSecret = "e1c62c5cde38626e02d30ec255216338";
const redirectUri = "http://localhost:3000/auth/facebook/callback";
const apiVersion = "v22.0";

// Helper function for consistent error handling
const handleFacebookError = (error, action) => {
    const fbError = error.response?.data?.error || {};
    
    const errorMap = {
      368: { message: "Temporary block", solution: "Wait 1 hour" },
      190: { message: "Expired token", solution: "Refresh token" },
      10: { message: "Permission denied", solution: "Check app permissions" }
    };
  
    const knownError = errorMap[fbError.code] || {
      message: fbError.message || error.message,
      solution: "Check API documentation"
    };
  
    console.error(`Facebook ${action} error:`, { 
      ...knownError,
      code: fbError.code,
      fbtrace_id: fbError.fbtrace_id 
    });
    
    throw new Error(JSON.stringify({
      type: 'FACEBOOK_API_ERROR',
      ...knownError,
      originalError: fbError
    }));
  };

// Function to get Facebook OAuth URL for authorization
export const getFacebookAuthUrl = () => {
  const scope = [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
    "public_profile",
    "email"
  ].join(",");
  
  const state = Math.random().toString(36).substring(2, 15);
  return `https://www.facebook.com/${apiVersion}/dialog/oauth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${state}&` +
    `response_type=code`;
};

// Function to exchange authorization code for access token
export const getFacebookAccessToken = async (code) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/oauth/access_token`,
      {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    handleFacebookError(error, "token exchange");
  }
};

// Function to get user's Facebook pages
export const getFacebookPages = async (accessToken) => {
    try {
      console.log('[DEBUG] Fetching pages with token:', accessToken);
      const response = await axios.get(
        `https://graph.facebook.com/v22.0/me/accounts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: "name,id,access_token,tasks" }
        }
      );
      
      console.log('[DEBUG] Pages raw response:', response.data);
      
      if (!response.data.data) {
        console.error('[DEBUG] No pages data in response:', response.data);
        throw new Error('No pages returned - check permissions');
      }
      
      return response.data.data.map(page => ({
        ...page,
        id: String(page.id), 
        canPost: page.tasks?.includes("CREATE_CONTENT") || false
      }));
      
    } catch (error) {
      console.error('[DEBUG] Facebook pages error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  };

// Function to get user info
export const getFacebookUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me`,
      {
        params: {
          fields: "id,name,email,picture.width(200).height(200)",
          access_token: accessToken
        }
      }
    );
    return response.data;
  } catch (error) {
    handleFacebookError(error, "fetch user info");
  }
};

// Function to post to Facebook page
export const postToFacebookPage = async (pageAccessToken, pageId, postData) => {
    try {
      // 1. First verify the page token is valid
      const debugResponse = await axios.get(`https://graph.facebook.com/v22.0/debug_token`, {
        params: {
          input_token: pageAccessToken,
          access_token: `${clientId}|${clientSecret}`
        }
      });
  
      console.log('Token debug info:', debugResponse.data.data);
  
      // 2. Determine if we're posting with an image or just text
      const endpoint = postData.imageUrl 
        ? `/${pageId}/photos` 
        : `/${pageId}/feed`;
  
      const params = {
        access_token: pageAccessToken,
        message: postData.message,
        ...(postData.imageUrl && { url: postData.imageUrl })
      };
  
      // 3. Make the actual post request
      const response = await axios.post(
        `https://graph.facebook.com/v22.0${endpoint}`,
        null, // Important: send params as query params for POST
        { params }
      );
  
      return response.data;
    } catch (error) {
      console.error('Detailed Facebook post error:', {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
        message: error.message
      });
      throw error;
    }
  };

// Function to post to user's timeline
export const postToFacebookTimeline = async (accessToken, postData) => {
  try {
    if (!postData.message && !postData.link && !postData.picture) {
      throw new Error("Post must contain at least a message, link, or picture");
    }

    const endpoint = postData.picture 
      ? "/me/photos" 
      : "/me/feed";

    const requestData = {
      access_token: accessToken,
      ...(postData.message && { message: postData.message }),
      ...(postData.link && { link: postData.link }),
      ...(postData.picture && { url: postData.picture }),
    };

    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}${endpoint}`,
      null,
      { params: requestData }
    );
    
    return response.data;
  } catch (error) {
    handleFacebookError(error, "timeline post");
  }
};

// Function to get page insights (analytics)
export const getFacebookPageInsights = async (pageAccessToken, pageId) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${pageId}/insights`,
      {
        params: {
          metric: "page_fans,page_impressions,page_engaged_users",
          period: "day",
          since: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000), // Last 7 days
          until: Math.floor(Date.now() / 1000),
          access_token: pageAccessToken
        }
      }
    );
    return response.data.data;
  } catch (error) {
    handleFacebookError(error, "fetch insights");
  }
};