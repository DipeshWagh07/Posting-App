import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const clientId = "1057966605784043";
const clientSecret = "d84933382c363ca71fcb146268ff0cdc";
const redirectUri = "http://localhost:3000/auth/facebook/callback";
const apiVersion = "v18.0";

// Enhanced error handler with more specific error codes
const handleFacebookError = (error, action) => {
  const fbError = error.response?.data?.error || {};
  
  const errorMap = {
    368: { 
      message: "Temporary block due to policy violations",
      solution: "Wait 1-24 hours and review Facebook policies",
      type: "TEMPORARY_BLOCK"
    },
    190: { 
      message: "Expired token", 
      solution: "Re-authenticate user",
      type: "TOKEN_EXPIRED"
    },
    10: { 
      message: "Permission denied", 
      solution: "Check app permissions in Facebook Developer Portal",
      type: "PERMISSION_DENIED"
    },
    200: {
      message: "Permissions error",
      solution: "Ensure you have all required permissions approved",
      type: "MISSING_PERMISSIONS"
    },
    4: {
      message: "Application request limit reached",
      solution: "Wait or increase your app limits",
      type: "RATE_LIMIT"
    }
  };

  const knownError = errorMap[fbError.code] || {
    message: fbError.message || error.message,
    solution: "Check Facebook API documentation",
    type: "UNKNOWN_ERROR"
  };

  console.error(`Facebook ${action} error:`, { 
    ...knownError,
    code: fbError.code,
    fbtrace_id: fbError.fbtrace_id,
    status: error.response?.status,
    config: error.config
  });
  
  const errorToThrow = new Error(knownError.message);
  errorToThrow.details = {
    type: 'FACEBOOK_API_ERROR',
    ...knownError,
    originalError: fbError,
    action
  };
  
  throw errorToThrow;
};

// Enhanced auth URL generator with more parameters
export const getFacebookAuthUrl = (state = null) => {
  const scope = [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
    "public_profile",
    "email"
  ].join(",");
  
  const authState = state || Math.random().toString(36).substring(2, 15);
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: "code",
    state: authState,
    auth_type: "rerequest",
    display: "popup"
  });

  return `https://www.facebook.com/${apiVersion}/dialog/oauth?${params.toString()}`;
};

// Enhanced token exchange with better validation
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
        timeout: 10000
      }
    );
    
    if (!response.data.access_token) {
      throw new Error("No access token in response");
    }
    
    // Validate token structure
    if (typeof response.data.access_token !== 'string' || 
        response.data.access_token.length < 50) {
      throw new Error("Invalid access token format");
    }
    
    return response.data.access_token;
  } catch (error) {
    handleFacebookError(error, "token exchange");
  }
};

// Enhanced pages fetcher with better error handling
export const getFacebookPages = async (accessToken) => {
  try {
    // First validate the access token
    await axios.get(
      `https://graph.facebook.com/${apiVersion}/me`,
      {
        params: { access_token: accessToken },
        timeout: 5000
      }
    );

    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me/accounts`,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Accept-Encoding': 'gzip' 
        },
        params: { 
          fields: "name,id,access_token,tasks,category,link,instagram_business_account",
          limit: 200
        },
        timeout: 15000
      }
    );
    
    if (!response.data.data) {
      throw new Error("Invalid pages data structure");
    }
    
    return response.data.data.map(page => ({
      id: String(page.id),
      name: page.name,
      access_token: page.access_token,
      category: page.category,
      link: page.link,
      instagram_business_account: page.instagram_business_account?.id,
      canPost: page.tasks?.includes("CREATE_CONTENT") || false
    }));
  } catch (error) {
    handleFacebookError(error, "fetch pages");
  }
};

// Enhanced user info fetcher with more fields
export const getFacebookUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me`,
      {
        params: {
          fields: "id,name,first_name,last_name,email,picture.width(200).height(200),accounts",
          access_token: accessToken
        },
        timeout: 10000
      }
    );
    
    if (!response.data.id) {
      throw new Error("Invalid user data structure");
    }
    
    return {
      id: response.data.id,
      name: response.data.name,
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      email: response.data.email || null,
      picture: response.data.picture?.data?.url || null,
      pages: response.data.accounts?.data || []
    };
  } catch (error) {
    handleFacebookError(error, "fetch user info");
  }
};

// Enhanced post function with media type detection
export const postToFacebookPage = async (pageAccessToken, pageId, postData) => {
  try {
    // 1. First verify the page token is valid
    const debugResponse = await axios.get(
      `https://graph.facebook.com/${apiVersion}/debug_token`,
      {
        params: {
          input_token: pageAccessToken,
          access_token: `${clientId}|${clientSecret}`
        },
        timeout: 5000
      }
    );

    const tokenData = debugResponse.data.data;
    if (!tokenData.is_valid) {
      throw new Error(`Invalid token: ${tokenData.error?.message}`);
    }

    // 2. Determine content type and endpoint
    let endpoint, params;
    const isVideo = postData.imageUrl?.match(/\.(mp4|mov|avi)$/i);
    
    if (isVideo) {
      endpoint = `/${pageId}/videos`;
      params = new URLSearchParams({
        access_token: pageAccessToken,
        description: postData.message || '',
        file_url: postData.imageUrl
      });
    } else if (postData.imageUrl) {
      endpoint = `/${pageId}/photos`;
      params = new URLSearchParams({
        access_token: pageAccessToken,
        message: postData.message || '',
        url: postData.imageUrl
      });
    } else {
      endpoint = `/${pageId}/feed`;
      params = new URLSearchParams({
        access_token: pageAccessToken,
        message: postData.message || ''
      });
    }

    // 3. Make the actual post request
    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}${endpoint}`,
      null,
      { 
        params,
        timeout: 30000 // Longer timeout for video uploads
      }
    );

    if (!response.data.id) {
      throw new Error("Invalid post response structure");
    }

    return {
      id: response.data.id,
      post_id: response.data.post_id || response.data.id,
      success: true,
      type: isVideo ? 'video' : (postData.imageUrl ? 'photo' : 'status')
    };
  } catch (error) {
    handleFacebookError(error, "create post");
  }
};

// New function to check token validity
export const verifyFacebookToken = async (accessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/debug_token`,
      {
        params: {
          input_token: accessToken,
          access_token: `${clientId}|${clientSecret}`
        },
        timeout: 5000
      }
    );
    
    return response.data.data;
  } catch (error) {
    handleFacebookError(error, "verify token");
  }
};