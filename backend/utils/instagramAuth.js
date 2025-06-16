import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Get credentials from environment variables
const INSTAGRAM_APP_ID = '2056002844893910';
const INSTAGRAM_APP_SECRET = 'e1c62c5cde38626e02d30ec255216338';
const INSTAGRAM_REDIRECT_URI = 'http://localhost:3000/auth/instagram/callback';

export const generateState = () => crypto.randomBytes(16).toString("hex");

// Function to get Instagram OAuth URL for authorization
export const getInstagramAuthUrl = () => {
    const state = Math.random().toString(36).substring(2, 15);
    const scope = "pages_show_list business_management instagram_basic instagram_content_publish";
    
    return `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      INSTAGRAM_REDIRECT_URI
    )}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;
  };

// Function to exchange authorization code for access token
export const getInstagramAccessToken = async (code) => {
  try {
    const response = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    
    // Get long-lived access token
    const longLivedToken = await exchangeForLongLivedToken(response.data.access_token);
    return {
      accessToken: longLivedToken,
      userId: response.data.user_id
    };
  } catch (error) {
    console.error(
      "Error exchanging authorization code for Instagram access token:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Exchange short-lived token for long-lived token
const exchangeForLongLivedToken = async (shortLivedToken) => {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortLivedToken}`
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error exchanging for long-lived token:", error);
    throw error;
  }
};

// Get user profile information
export const getInstagramUserProfile = async (accessToken) => {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting Instagram user profile:", error);
    throw error;
  }
};

// Function to post image to Instagram (requires Facebook Page connection)
export const postToInstagram = async (accessToken, imageUrl, caption) => {
  try {
    // Step 1: Get user Instagram Business Account ID
    const profileResponse = await axios.get(
      `https://graph.facebook.com/v17.0/me/accounts?access_token=${accessToken}`
    );
    
    const pageId = profileResponse.data.data[0].id;
    const pageAccessToken = profileResponse.data.data[0].access_token;
    
    // Step 2: Get Instagram Business Account ID
    const igAccountResponse = await axios.get(
      `https://graph.facebook.com/v17.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );
    
    const igBusinessAccountId = igAccountResponse.data.instagram_business_account.id;
    
    // Step 3: Create a container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v17.0/${igBusinessAccountId}/media`,
      {
        image_url: imageUrl,
        caption: caption
      },
      {
        params: {
          access_token: pageAccessToken
        }
      }
    );
    
    const containerId = containerResponse.data.id;
    
    // Step 4: Publish the container
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v17.0/${igBusinessAccountId}/media_publish`,
      {
        creation_id: containerId
      },
      {
        params: {
          access_token: pageAccessToken
        }
      }
    );
    
    return publishResponse.data;
  } catch (error) {
    console.error(
      "Error posting to Instagram:",
      error.response?.data || error.message
    );
    throw error;
  }
};