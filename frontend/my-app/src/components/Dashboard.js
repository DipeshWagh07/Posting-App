import React, { useState, useEffect } from "react";
import axios from "axios";
import { getUserURN } from "../utils/linkedin";
import "../styles.css";

const Dashboard = () => {
  // State initialization
  const [linkedinAccessToken, setLinkedinAccessToken] = useState(
    localStorage.getItem("linkedin_access_token") || ""
  );

  const [instagramUserId, setInstagramUserId] = useState(
    localStorage.getItem("instagram_user_id") || ""
  );
  const [facebookAccessToken, setFacebookAccessToken] = useState(
    localStorage.getItem("facebook_access_token") || ""
  );
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState("");

  const [youtubeToken, setYoutubeAccessToken] = useState(
    localStorage.getItem("youtube_access_token") || ""
  );
  const [twitterXAccessToken, setTwitterXAccessToken] = useState(
    localStorage.getItem("twitterX_access_token") || ""
  );

  const [whatsappAccessToken, setWhatsappAccessToken] = useState(
    localStorage.getItem("whatsapp_access_token") || ""
  );

const [tiktokAuthState, setTiktokAuthState] = useState('');
const [tiktokAccessToken, setTiktokAccessToken] = useState(
  localStorage.getItem('tiktok_access_token') || ''
);
const [tiktokOpenId, setTiktokOpenId] = useState(
  localStorage.getItem('tiktok_open_id') || ''
);


  const [postText, setPostText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState("");
  const [imageUrl] = useState("");
  const [tiktokStatus, setTiktokStatus] = useState('');

  const [selectedPlatforms, setSelectedPlatforms] = useState({
    linkedin: false,
    instagram: false,
    facebook: false,
    youtube: false,
    twitterX: false,
    whatsapp: false,
      tiktok: false,

  });

  // Initialize connections on component mount
 useEffect(() => {
  const initConnections = async () => {  // Make this async
    const linkedinToken = localStorage.getItem("linkedin_access_token");
    const instagramUserId = localStorage.getItem("instagram_user_id");
    const facebookToken = localStorage.getItem("facebook_access_token");
    const youtubeToken = localStorage.getItem("youtube_access_token");
    const twitterXToken = localStorage.getItem("twitterX_access_token");
    const whatsappToken = localStorage.getItem("whatsapp_access_token");
    // const tiktokToken = localStorage.getItem("tiktok_access_token");
    const tiktokOpenId = localStorage.getItem("tiktok_open_id");

    if (linkedinToken) {
      setLinkedinAccessToken(linkedinToken);
      setSelectedPlatforms((prev) => ({ ...prev, linkedin: true }));
    }
    if (instagramUserId && facebookToken) {
      setInstagramUserId(instagramUserId);
      setSelectedPlatforms((prev) => ({ ...prev, instagram: true }));
    }

    if (facebookToken) {
      setFacebookAccessToken(facebookToken);
      setSelectedPlatforms((prev) => ({ ...prev, facebook: true }));

      // Load saved pages from localStorage if available
      const savedPages = localStorage.getItem("facebook_pages");
      if (savedPages) {
        const parsedPages = JSON.parse(savedPages);
        setFacebookPages(parsedPages);
        if (parsedPages.length > 0) {
          setSelectedFacebookPageId(parsedPages[0].id);
        }
      }

      // Then refresh from API
      await loadFacebookPages(facebookToken);  // Add await here too if loadFacebookPages is async
    }

    if (youtubeToken) {
      setYoutubeAccessToken(youtubeToken);
      setSelectedPlatforms((prev) => ({ ...prev, youtube: true }));
    }

    if (twitterXToken) {
      setTwitterXAccessToken(twitterXToken);
      setSelectedPlatforms((prev) => ({ ...prev, twitterX: true }));
    }

    if (whatsappToken) {
      setWhatsappAccessToken(whatsappToken);
      setSelectedPlatforms((prev) => ({ ...prev, whatsapp: true }));
    }
        
   if (tiktokAccessToken && tiktokOpenId) {
    setSelectedPlatforms(prev => ({ ...prev, tiktok: true }));
  }
}
    // Handle Instagram callback if the URL contains the code
    const urlParams = new URLSearchParams(window.location.search);
    const instagramCode = urlParams.get("code");
    const instagramState = urlParams.get("state");
    const tiktokCode = urlParams.get('code');
    const tiktokState = urlParams.get('state');

   if (tiktokCode && tiktokState) {
    const savedState = localStorage.getItem('tiktok_auth_state');
    if (tiktokState === savedState) {
      handleTikTokAuth(tiktokCode);
    } else {
      console.error('State mismatch in TikTok callback');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
    
      if (instagramCode && instagramState) {
        // Clean the URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
              
      // Handle TikTok callback from URL hash
  if (window.location.pathname === '/tiktok-callback') {
    const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
       if (params.has('access_token')) {
        
      const accessToken = params.get('access_token');
      const openId = params.get('open_id');
      
      localStorage.setItem('tiktok_access_token', accessToken);
      localStorage.setItem('tiktok_open_id', openId);
      setTiktokAccessToken(accessToken);
      setTiktokOpenId(openId);
      setSelectedPlatforms(prev => ({ ...prev, tiktok: true }));
      setPostStatus('TikTok connected successfully!');
    
    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname);
  } 
           else if (hashParams.has('error')) {
      setPostStatus(`TikTok Error: ${hashParams.get('error')}`);
      window.history.replaceState({}, '', '/');
    }        }





      // Handle Twitter callback state if present
      const locationState = window.history.state;
      if (locationState?.twitterConnected) {
        setPostStatus("Twitter connected successfully!");
        setTimeout(() => setPostStatus(""), 3000);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } else if (locationState?.twitterError) {
        setPostStatus(`Error: ${locationState.twitterError}`);
        setTimeout(() => setPostStatus(""), 5000);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
 
    
    const interval = setInterval(checkTokenExpiry, 86400000);
      


    initConnections();

    return () => clearInterval(interval);

    
  }, []);

  // Load Facebook pages when Facebook is connected
  

  const loadFacebookPages = async (userAccessToken) => {
    try {
      // Step 1: Verify we have a valid token
      if (!userAccessToken) {
        throw new Error("No Facebook access token available");
      }

      // Step 2: Exchange for long-lived token (if needed)
      let longLivedToken = localStorage.getItem("fb_long_lived_token");
      if (!longLivedToken) {
        console.log("Exchanging for long-lived token...");
        longLivedToken = await exchangeForLongLivedToken(userAccessToken);
        localStorage.setItem("fb_long_lived_token", longLivedToken);
        setFacebookAccessToken(longLivedToken);
      }

      // Step 3: Get pages with their tokens
      console.log("Fetching pages with long-lived token...");
      const pagesResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts`,
        {
          params: {
            access_token: longLivedToken,
            fields:
              "id,name,access_token,instagram_business_account{id,username}",
          },
        }
      );

      // Step 4: Process pages and verify tokens
      const pages = await Promise.all(
        pagesResponse.data.data.map(async (page) => {
          try {
            // Verify the page token is valid
            const tokenInfo = await verifyFacebookToken(page.access_token);

            // Get Instagram details if connected
            let instagramAccount = null;
            if (page.instagram_business_account?.id) {
              try {
                const instagramResponse = await axios.get(
                  `https://graph.facebook.com/v18.0/${page.instagram_business_account.id}`,
                  {
                    params: {
                      access_token: page.access_token,
                      fields: "id,username,profile_picture_url",
                    },
                  }
                );
                instagramAccount = instagramResponse.data;
              } catch (instagramError) {
                console.error(
                  `Failed to get Instagram details for page ${page.id}:`,
                  instagramError
                );
              }
            }

            return {
              id: page.id,
              name: page.name,
              accessToken: page.access_token,
              instagramAccount,
              tokenExpiresAt: tokenInfo.expires_at,
            };
          } catch (tokenError) {
            console.error(
              `Token verification failed for page ${page.id}:`,
              tokenError
            );
            return null; // Skip pages with invalid tokens
          }
        })
      );

      // Filter out null pages (those with invalid tokens)
      const validPages = pages.filter((page) => page !== null);

      if (validPages.length === 0) {
        throw new Error("No valid pages found with working access tokens");
      }

      setFacebookPages(validPages);
      localStorage.setItem("facebook_pages", JSON.stringify(validPages));

      // Select the first page by default, or maintain current selection if still valid
      const currentSelectedValid = validPages.some(
        (page) => page.id === selectedFacebookPageId
      );
      if (!currentSelectedValid) {
        setSelectedFacebookPageId(validPages[0].id);
      }
    } catch (error) {
      console.error("Complete page loading error:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      });

      setPostStatus(`Error: ${error.message}`);

      // If token is invalid, clear it to force reauthentication
      if (
        error.message.includes("invalid token") ||
        error.message.includes("expired")
      ) {
        localStorage.removeItem("fb_long_lived_token");
        localStorage.removeItem("facebook_access_token");
        localStorage.removeItem("facebook_pages");
        setFacebookAccessToken("");
        setFacebookPages([]);
        setSelectedFacebookPageId("");
      }
    }
  };
    


  
  // Add to your useEffect or set up a timer
  const checkTokenExpiry = async () => {
    const longLivedToken = localStorage.getItem("fb_long_lived_token");
    if (!longLivedToken) return;

    try {
      const debug = await axios.get(`https://graph.facebook.com/debug_token`, {
        params: {
          input_token: longLivedToken,
          access_token: `${process.env.REACT_APP_FB_APP_ID}|${process.env.REACT_APP_FB_APP_SECRET}`,
        },
      });

      const expiresAt = debug.data.data.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const daysLeft = Math.floor((expiresAt - now) / 86400);

      if (daysLeft < 7) {
        // Refresh if less than 7 days left
        const newToken = await exchangeForLongLivedToken(longLivedToken);
        localStorage.setItem("fb_long_lived_token", newToken);
        setFacebookAccessToken(newToken);
      }
    } catch (error) {
      console.error("Token check failed:", error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Clear all tokens from localStorage
    localStorage.removeItem("linkedin_access_token");
    localStorage.removeItem("instagram_user_id");
    localStorage.removeItem("facebook_access_token");
    localStorage.removeItem("facebook_pages");
    localStorage.removeItem("fb_long_lived_token");

    localStorage.removeItem("youtube_access_token");
    localStorage.removeItem("twitterX_access_token");

    localStorage.removeItem("whatsapp_access_token");
    setWhatsappAccessToken("");

    // Reset all state
    setLinkedinAccessToken("");

    setInstagramUserId("");
    setFacebookAccessToken("");
    setYoutubeAccessToken("");
    setTwitterXAccessToken("");
    setFacebookPages([]);
    setSelectedPlatforms({
      linkedin: false,
      instagram: false,
      facebook: false,
      youtube: false,
      twitterX: false,
    });
  };

  // File handling
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
  };

  // Platform toggle handler
  const handlePlatformToggle = (platform) => {
    if (selectedPlatforms[platform]) {
      // Disconnect platform if currently connected
      handleDisconnect(platform);
    } else {
      // Connect platform if currently disconnected
      switch (platform) {
        case "linkedin":
          connectLinkedIn();
          break;
        case "instagram":
          connectInstagram();
          break;
        case "facebook":
          connectFacebook();
          break;
        case "youtube":
          connectYouTube();
          break;
        case "twitterX":
          connectTwitterX();
          break;
        case "whatsapp":
          connectWhatsApp();
          break;
        default:
          break;
           case "tiktok":
        connectTikTok();
        break;
      }
    }
  };

  // Platform connection methods
  const connectLinkedIn = () => {
    const CLIENT_ID = "77igg9177iv3cg";
    const REDIRECT_URI = encodeURIComponent(
      "http://localhost:3000/auth/linkedin/callback"
    );
    const scope = encodeURIComponent("openid profile email w_member_social");
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&state=${state}`;
  };

  // connectInstagram function:
  const connectInstagram = async () => {
    try {
      setIsPosting(true);
      setPostStatus("Connecting Instagram...");

      // Check if we already have an Instagram connection
      if (instagramUserId) {
        setPostStatus("Instagram is already connected");
        return;
      }

      // Check if we have Facebook connected (optional)
      const hasFacebook = facebookAccessToken && selectedFacebookPageId;

      if (hasFacebook) {
        // Option 1: Connect through Facebook page
        const pageInfo = await axios.get(
          `https://graph.facebook.com/v18.0/${selectedFacebookPageId}`,
          {
            params: {
              fields: "instagram_business_account{id,username}",
              access_token: facebookAccessToken,
            },
          }
        );

        if (pageInfo.data.instagram_business_account) {
          const instagramAccount = pageInfo.data.instagram_business_account;
          setInstagramUserId(instagramAccount.id);
          localStorage.setItem("instagram_user_id", instagramAccount.id);
          setSelectedPlatforms((prev) => ({ ...prev, instagram: true }));
          setPostStatus(
            `Connected to Instagram account @${instagramAccount.username}`
          );
          return;
        }
      }

      // Option 2: Direct Instagram connection
      const CLIENT_ID = "1057966605784043";
      const REDIRECT_URI = encodeURIComponent(
        "http://localhost:3000/auth/instagram/callback"
      );
      const scope = encodeURIComponent("user_profile,user_media");
      const state = Math.random().toString(36).substring(2, 15);

      window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=code&state=${state}`;
    } catch (error) {
      console.error("Instagram connection error:", error);
      setPostStatus(error.message || "Failed to connect to Instagram");
    } finally {
      setIsPosting(false);
      setTimeout(() => setPostStatus(""), 8000);
    }
  };
  const connectFacebook = () => {
    const CLIENT_ID = "1057966605784043";
    const REDIRECT_URI = encodeURIComponent(
      "http://localhost:3000/auth/facebook/callback"
    );
    const scope = encodeURIComponent(
      "pages_manage_posts,pages_read_engagement,pages_show_list"
    );
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=code&state=${state}`;
  };

  const connectYouTube = () => {
    window.location.href = "http://localhost:8000/auth/youtube";
  };

  const connectTwitterX = async () => {
    try {
      localStorage.removeItem("twitterX_access_token");
      localStorage.removeItem("twitterX_access_secret");

      const response = await axios.get("http://localhost:8000/auth/twitter");
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        throw new Error("Failed to get Twitter auth URL");
      }
    } catch (error) {
      console.error("Twitter connection error:", error);
      setPostStatus("Error: Failed to connect to Twitter");
      setTimeout(() => setPostStatus(""), 5000);
    }
  };

  const connectWhatsApp = () => {
    const CLIENT_ID = "1057966605784043";
    const REDIRECT_URI = encodeURIComponent(
      "http://localhost:3000/auth/whatsapp/callback"
    );
    const scope = encodeURIComponent("whatsapp_business_messaging");
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.whatsapp.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&state=${state}`;
  };


  const handleMessage = (event) => {
    // Allow messages from TikTok's domain (for initial auth flow)
    const allowedOrigins = [
      window.location.origin, // Your app's origin
      'https://www.tiktok.com' // TikTok's origin
    ];
    
    if (!allowedOrigins.includes(event.origin)) {
      console.warn('Ignoring message from unexpected origin:', event.origin);
      return;
    }

    if (event.data.type === 'tiktok-auth-success') {
      const { accessToken, openId } = event.data.payload;
      localStorage.setItem('tiktok_access_token', accessToken);
      localStorage.setItem('tiktok_open_id', openId);
      setTiktokAccessToken(accessToken);
      setTiktokOpenId(openId);
      setSelectedPlatforms(prev => ({ ...prev, tiktok: true }));
      setPostStatus('TikTok connected successfully!');
    } else if (event.data.type === 'tiktok-auth-error') {
      setPostStatus(`Error: ${event.data.error}`);
    }
  };

  window.addEventListener('message', handleMessage);
      
      
const connectTikTok = async () => {
  try {
    setTiktokStatus('Connecting to TikTok...');
    
    // Clear any existing tokens
    localStorage.removeItem('tiktok_access_token');
    localStorage.removeItem('tiktok_open_id');
    
    // Get auth URL from backend
    const response = await axios.get('https://postingapp-g0p1.onrender.com/auth/tiktok');
    const { authUrl, state } = response.data;
    
    // Store state in localStorage
    localStorage.setItem('tiktok_auth_state', state);
    
    // Redirect to TikTok login page (full page redirect)
    window.location.href = authUrl;
    
  } catch (error) {
    setTiktokStatus(`TikTok connection failed: ${error.message}`);
    console.error('TikTok connection error:', error);
  }
};


// Updated postToTikTok function
const postToTikTok = async (caption, file) => {
  if (!tiktokAccessToken || !tiktokOpenId) {
    throw new Error('Please connect to TikTok first');
  }

  if (!file || !file.type.startsWith('video/')) {
    throw new Error('Please select a video file for TikTok');
  }

  try {
    setPostStatus('Uploading video to TikTok...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accessToken', tiktokAccessToken);
    formData.append('openId', tiktokOpenId);
    
    // Step 1: Upload video
    const uploadResponse = await axios.post(
      'https://postingapp-g0p1.onrender.com/api/tiktok/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    // Step 2: Create post
    const postResponse = await axios.post(
      'https://postingapp-g0p1.onrender.com/api/tiktok/post',
      {
        accessToken: tiktokAccessToken,
        openId: tiktokOpenId,
        caption,
        videoId: uploadResponse.data.videoId
      }
    );

    return postResponse.data;
  } catch (error) {
    console.error('TikTok posting error:', error);
    throw new Error(error.response?.data?.error || 'Failed to post to TikTok');
  }
};



  // Handle platform disconnection
  const handleDisconnect = (platform) => {
    switch (platform) {
      case "linkedin":
        localStorage.removeItem("linkedin_access_token");
        setLinkedinAccessToken("");
        break;
      case "instagram":
        localStorage.removeItem("instagram_user_id");
        setInstagramUserId("");
        break;
      case "facebook":
        localStorage.removeItem("facebook_access_token");
        localStorage.removeItem("facebook_pages");
        setFacebookAccessToken("");
        setFacebookPages([]);
        setSelectedFacebookPageId("");
        break;
      case "youtube":
        localStorage.removeItem("youtube_access_token");
        localStorage.removeItem("youtube_refresh_token");
        localStorage.removeItem("youtube_channel_id");
        localStorage.removeItem("youtube_channel_name");
        setYoutubeAccessToken("");
        break;
      case "twitterX":
        localStorage.removeItem("twitterX_access_token");
        setTwitterXAccessToken("");
        break;
      default:
        break;
        case "tiktok":
     localStorage.removeItem("tiktok_access_token");
  localStorage.removeItem("tiktok_open_id");
  setTiktokAccessToken("");
  // setTikTokOpenId("");
      break;


    }

    setSelectedPlatforms((prev) => ({
      ...prev,
      [platform]: false,
    }));
  };

  // Main post handler
  const handlePost = async () => {
    // Validation checks
    if (!postText.trim() && !selectedFile) {
      setPostStatus("Please enter text or select an image to post");
      return;
    }

    if (!Object.values(selectedPlatforms).some((v) => v)) {
      setPostStatus("Please select at least one platform to post to");
      return;
    }

    if (
      selectedPlatforms.youtube &&
      (!selectedFile || !selectedFile.type.startsWith("video/"))
    ) {
      setPostStatus("A video file is required for YouTube posts");
      return;
    }



    

    setIsPosting(true);
    setPostStatus("Posting to selected platforms...");

    try {
      if (selectedPlatforms.facebook) {
        // Find the selected page with its access token
        const selectedPage = facebookPages.find(
          (page) => page.id === selectedFacebookPageId
        );

        if (!selectedPage) {
          throw new Error("Selected Facebook page not found");
        }

        // Debug: Verify the token exists
        console.log("Page access token:", selectedPage.accessToken);
        if (!selectedPage.accessToken) {
          throw new Error("No access token available for this page");
        }

        // Debug: Verify token validity
        await verifyFacebookToken(selectedPage.accessToken);

        const formData = new FormData();
        formData.append("message", postText);

        if (selectedFile) {
          formData.append("source", selectedFile); // Facebook expects 'source'
        }

        // Post directly to Facebook API
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${selectedPage.id}/photos`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${selectedPage.accessToken}`,
            },
          }
        );

        if (selectedPlatforms.instagram && selectedPage.instagramAccount) {
          await postToInstagram(
            selectedPage.accessToken,
            selectedPage.instagramAccount.id,
            postText,
            selectedFile
          );
          setPostStatus("Posted to Facebook and Instagram successfully!");
        } else {
          setPostStatus("Posted to Facebook successfully!");
        }
      }
      // Post to Instagram only if selected (without Facebook)
      else if (selectedPlatforms.instagram) {
        // Find the first page with Instagram connection
        const instagramPage = facebookPages.find(
          (page) => page.instagramAccount
        );

        if (!instagramPage) {
          throw new Error(
            "No Instagram account connected to any Facebook page"
          );
        }

        await postToInstagram(
          instagramPage.accessToken,
          instagramPage.instagramAccount.id,
          postText,
          selectedFile
        );
        setPostStatus("Posted to Instagram successfully!");
      }

      // Post to LinkedIn
      if (selectedPlatforms.linkedin && linkedinAccessToken) {
        const userUrn = await getUserURN(linkedinAccessToken);
        if (!userUrn) throw new Error("Failed to get LinkedIn user info");

        await axios.post("http://localhost:8000/api/post-to-linkedin", {
          accessToken: linkedinAccessToken,
          text: postText,
          userUrn,
          imageUrl,
        });
      }

      // Post to YouTube
      if (
        selectedPlatforms.youtube &&
        youtubeToken &&
        selectedFile?.type.startsWith("video/")
      ) {
        const youtubeFormData = new FormData();
        youtubeFormData.append("video", selectedFile);
        youtubeFormData.append("title", postText);

        await axios.post(
          "http://localhost:8000/api/upload-youtube-video",
          youtubeFormData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      // Post to TikTok
if (selectedPlatforms.tiktok && tiktokAccessToken) {
      if (!selectedFile || !selectedFile.type.startsWith("video/")) {
        throw new Error("A video file is required for TikTok posts");
      }
      
      await postToTikTok(postText, selectedFile);
    }


      // Post to Twitter
      if (selectedPlatforms.twitterX && twitterXAccessToken) {
        await axios.post(
          "http://localhost:8000/api/twitter/post",
          {
            content: postText,
            mediaUrls: imageUrl ? [imageUrl] : [],
          },
          { withCredentials: true }
        );
      }
      // Post to WhatsApp
      if (selectedPlatforms.whatsapp && whatsappAccessToken) {
        await axios.post(
          "http://localhost:8000/api/whatsapp/post",
          {
            message: postText,
            mediaUrl: imageUrl,
          },
          {
            headers: {
              Authorization: `Bearer ${whatsappAccessToken}`,
            },
          }
        );
      }

      setPostStatus("Successfully posted to selected platforms!");
      setPostText("");
      setSelectedFile(null);
      setPreviewImage(null);
    } catch (error) {
      console.error("Posting error:", error);
      if (error.response) {
        console.error("Error details:", error.response.data);
      }
      setPostStatus(
        `Error: ${
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to post"
        }`
      );
    } finally {
      setIsPosting(false);
      setTimeout(() => setPostStatus(""), 5000);
    }
  };

  const postToInstagram = async (
    pageAccessToken,
    instagramUserId,
    caption,
    file
  ) => {
    try {
      // Upload file to Cloudinary via your server
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const uploadResponse = await axios.post(
        "http://localhost:8000/api/instagram/upload",
        uploadForm,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!uploadResponse.data.url) {
        throw new Error("Failed to upload image to Cloudinary");
      }

      // Create Instagram post with the Cloudinary URL
      const postResponse = await axios.post(
        "http://localhost:8000/api/instagram/post",
        {
          pageAccessToken,
          instagramUserId,
          caption,
          imageUrl: uploadResponse.data.url,
        }
      );

      return postResponse.data;
    } catch (error) {
      console.error("Instagram posting error:", error);
      throw new Error(
        `Instagram: ${error.response?.data?.error?.message || error.message}`
      );
    }
  };

  // Exchange short-lived token for long-lived token
  const exchangeForLongLivedToken = async (shortLivedToken) => {
    // Validate environment configuration first
    if (
      !process.env.REACT_APP_FB_APP_ID ||
      !process.env.REACT_APP_FB_APP_SECRET
    ) {
      const error = new Error(
        "Facebook app credentials missing in environment variables.\n" +
          "Please ensure your .env file contains:\n" +
          "REACT_APP_FB_APP_ID and REACT_APP_FB_APP_SECRET"
      );
      console.error(error.message);
      throw error;
    }

    try {
      // Directly exchange for long-lived token without separate validation
      const exchangeResponse = await axios.get(
        `https://graph.facebook.com/v18.0/oauth/access_token`,
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: process.env.REACT_APP_FB_APP_ID,
            client_secret: process.env.REACT_APP_FB_APP_SECRET,
            fb_exchange_token: shortLivedToken,
          },
        }
      );

      if (!exchangeResponse.data.access_token) {
        throw new Error("No access token returned in response");
      }

      return exchangeResponse.data.access_token;
    } catch (error) {
      const apiError = new Error(
        `Facebook token exchange failed: ${
          error.response?.data?.error?.message || error.message
        }`
      );
      apiError.details = {
        url: error.config?.url,
        params: { ...error.config?.params, client_secret: "***" }, // Mask secret
        response: error.response?.data,
      };
      console.error("Facebook API Error:", apiError.details);
      throw apiError;
    }
  };

  const getPermanentPageToken = async (userAccessToken, pageId) => {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}`,
        {
          params: {
            fields: "access_token",
            access_token: userAccessToken,
          },
          timeout: 8000, // 10 second timeout
        }
      );

      if (!response.data.access_token) {
        throw new Error("No access token returned for page");
      }

      return response.data.access_token;
    } catch (error) {
      const err = new Error(
        `Failed to get page token: ${
          error.response?.data?.error?.message || error.message
        }`
      );
      err.pageId = pageId;
      console.error("Page token error:", {
        pageId,
        error: error.response?.data || error.message,
      });
      throw err;
    }
  };



  const handleFacebookPost = async () => {
    // Validation checks
    if (!selectedPlatforms.facebook) {
      setPostStatus("Please enable Facebook platform first");
      return;
    }

    if (!postText.trim() && !selectedFile) {
      setPostStatus("Please enter text or select an image to post");
      return;
    }

    setIsPosting(true);
    setPostStatus("Preparing Facebook post...");

    try {
      // Find the selected page
      const selectedPage = facebookPages.find(
        (page) => page.id === selectedFacebookPageId
      );
      if (!selectedPage) {
        throw new Error(
          "Selected Facebook page not found in your connected pages"
        );
      }

      if (!selectedPage.accessToken) {
        throw new Error("No valid access token available for this page");
      }

      // Prepare form data
      const formData = new FormData();
      formData.append("message", postText);

      if (selectedFile) {
        // Validate file type if needed
        if (!selectedFile.type.match(/(image|video)\/.*/)) {
          throw new Error("Only image or video files are supported");
        }
        formData.append("source", selectedFile);
      }

      setPostStatus("Uploading to Facebook...");

      // Make the API request
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${selectedPage.id}/photos`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${selectedPage.accessToken}`,
          },
          timeout: 30000, // 30 second timeout for uploads
        }
      );

      if (!response.data.id) {
        throw new Error("Facebook post succeeded but no post ID returned");
      }

      setPostStatus("Posted to Facebook successfully!");
      console.log("Facebook post created with ID:", response.data.id);

      // Reset form if successful
      setPostText("");
      setSelectedFile(null);
      setPreviewImage(null);

      // Return the post ID for potential future reference
      return response.data.id;
    } catch (error) {
      let errorMessage = "Failed to post to Facebook";

      if (error.response) {
        // Handle specific Facebook API errors
        const fbError = error.response.data?.error;
        if (fbError) {
          errorMessage = `Facebook error: ${fbError.message}`;
          if (fbError.error_user_msg) {
            errorMessage += ` (${fbError.error_user_msg})`;
          }
        }
      } else {
        errorMessage = error.message;
      }

      console.error("Facebook posting error:", {
        error: error.message,
        response: error.response?.data,
        stack: error.stack,
      });

      setPostStatus(errorMessage);
      throw error; // Re-throw for any error handling further up the chain
    } finally {
      setIsPosting(false);
    }
  };

const checkTikTokToken = async () => {
  const token = localStorage.getItem('tiktok_access_token');
  if (!token) return;

  try {
    const response = await axios.get('/api/tiktok/check-token', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-open-id': localStorage.getItem('tiktok_open_id')
      }
    });
    
    if (response.data.expiresIn < 86400) { // Less than 1 day left
      const refreshResponse = await axios.post('/api/tiktok/refresh', {
        refreshToken: localStorage.getItem('tiktok_refresh_token')
      });
      
      localStorage.setItem('tiktok_access_token', refreshResponse.data.accessToken);
      setTiktokAccessToken(refreshResponse.data.accessToken);
    }
  } catch (error) {
    console.error('Token check failed:', error);
  }
};

  const verifyFacebookToken = async (token) => {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/debug_token`,
        {
          params: {
            input_token: token,
            access_token: `${process.env.REACT_APP_FB_APP_ID}|${process.env.REACT_APP_FB_APP_SECRET}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("Token verification failed:", error);
      throw new Error(
        `Invalid Facebook token: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  };


  const handleTikTokAuth = async (code) => {
  try {
    // This is only needed if you're handling the callback directly
    if (code) {
      const response = await axios.post('/auth/tiktok/exchange', { code });
      const { access_token, open_id } = response.data;
      
      localStorage.setItem('tiktok_access_token', access_token);
      localStorage.setItem('tiktok_open_id', open_id);
      setTiktokAccessToken(access_token);
      setTiktokOpenId(open_id);
      setSelectedPlatforms(prev => ({ ...prev, tiktok: true }));
      setPostStatus('TikTok connected successfully!');
    } else {
      await connectTikTok();
    }
  } catch (error) {
    console.error('TikTok authentication error:', error);
    setPostStatus(`TikTok connection failed: ${error.message}`);
  }
};

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Social Media Dashboard</h2>
        {(linkedinAccessToken ||
          instagramUserId ||
          facebookAccessToken ||
          youtubeToken ||
          twitterXAccessToken) && (
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      <div className="platform-connections">
        <h3>Social Media Platforms</h3>
        <div className="platform-list">
          {/* LinkedIn Connection */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.linkedin}
                  onChange={() => handlePlatformToggle("linkedin")}
                  disabled={!linkedinAccessToken && selectedPlatforms.linkedin}
                />
                LinkedIn{" "}
                {linkedinAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className={`connect-button ${
                linkedinAccessToken ? "connected" : ""
              }`}
              onClick={
                linkedinAccessToken
                  ? () => handleDisconnect("linkedin")
                  : connectLinkedIn
              }
            >
              {linkedinAccessToken ? "Disconnect" : "Connect"} LinkedIn
            </button>
          </div>

          {/* Instagram Connection */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.instagram}
                  onChange={() => handlePlatformToggle("instagram")}
                  disabled={!instagramUserId && selectedPlatforms.instagram}
                />
                Instagram {instagramUserId ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className={`connect-button instagram-connect ${
                instagramUserId ? "connected" : ""
              }`}
              onClick={
                instagramUserId
                  ? () => handleDisconnect("instagram")
                  : connectInstagram
              }
            >
              {instagramUserId ? "Disconnect" : "Connect"} Instagram
            </button>
          </div>

          {/* Facebook Connection */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.facebook}
                  onChange={() =>
                    setSelectedPlatforms((prev) => ({
                      ...prev,
                      facebook: !prev.facebook,
                    }))
                  }
                  disabled={!facebookAccessToken}
                />
                Facebook{" "}
                {facebookAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className={`connect-button facebook-connect ${
                facebookAccessToken ? "connected" : ""
              }`}
              onClick={
                facebookAccessToken
                  ? () => handleDisconnect("facebook")
                  : connectFacebook
              }
            >
              {facebookAccessToken ? "Disconnect" : "Connect"} Facebook
            </button>
          </div>

          {/* YouTube Connection */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.youtube}
                  onChange={() => handlePlatformToggle("youtube")}
                  disabled={!youtubeToken && selectedPlatforms.youtube}
                />
                YouTube {youtubeToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className={`youtube-button ${youtubeToken ? "connected" : ""}`}
              onClick={
                youtubeToken
                  ? () => handleDisconnect("youtube")
                  : connectYouTube
              }
            >
              {youtubeToken ? "Disconnect" : "Connect"} YouTube
            </button>
          </div>

         
{/* TikTok Connection */}
<div className="platform-item">
  <div className="platform-status">
    <label>
      <input
        type="checkbox"
        checked={selectedPlatforms.tiktok}
        onChange={() => handlePlatformToggle("tiktok")}
        disabled={!tiktokAccessToken && selectedPlatforms.tiktok}
      />
      TikTok {tiktokAccessToken ? "(Connected)" : "(Not Connected)"}
    </label>
    {tiktokStatus && (
      <div className={`status-message ${
        tiktokStatus.includes("Error") ? "error" : "success"
      }`}>
        {tiktokStatus}
      </div>
    )}
  </div>
  <button
    className={`connect-button tiktok-button ${
      tiktokAccessToken ? "connected" : ""
    }`}
    onClick={
      tiktokAccessToken
        ? () => handleDisconnect("tiktok")
        : connectTikTok
    }
    disabled={tiktokStatus.includes('Connecting')}
  >
    {tiktokAccessToken ? "Disconnect" : 
     tiktokStatus.includes('Connecting') ? "Connecting..." : "Connect"} TikTok
  </button>
</div>
          {/* WhatsApp Connection */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.whatsapp}
                  onChange={() => handlePlatformToggle("whatsapp")}
                  disabled={!whatsappAccessToken && selectedPlatforms.whatsapp}
                />
                WhatsApp{" "}
                {whatsappAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className={`connect-button whatsapp-button ${
                whatsappAccessToken ? "connected" : ""
              }`}
              onClick={
                whatsappAccessToken
                  ? () => handleDisconnect("whatsapp")
                  : connectWhatsApp
              }
            >
              {whatsappAccessToken ? "Disconnect" : "Connect"} WhatsApp
            </button>
          </div>

          {/* Twitter Connection */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.twitterX}
                  onChange={() => handlePlatformToggle("twitterX")}
                  disabled={!twitterXAccessToken && selectedPlatforms.twitterX}
                />
                TwitterX{" "}
                {twitterXAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className={`twitter-button ${
                twitterXAccessToken ? "connected" : ""
              }`}
              onClick={
                twitterXAccessToken
                  ? () => handleDisconnect("twitterX")
                  : connectTwitterX
              }
            >
              {twitterXAccessToken ? "Disconnect" : "Connect"} TwitterX
            </button>
          </div>
        </div>

        {/* Facebook Page Selection */}
        {facebookAccessToken && facebookPages.length > 0 && (
          <div className="facebook-page-selection">
            <h4>Select Facebook Page</h4>
            <select
              value={selectedFacebookPageId}
              onChange={(e) => setSelectedFacebookPageId(e.target.value)}
              className="page-select"
            >
              {facebookPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="post-form">
        <h3>Create a Social Media Post</h3>
        <textarea
          className="post-textarea"
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="What would you like to share?"
          rows={5}
          disabled={isPosting}
        />

        <div className="file-upload-container">
          <input
            type="file"
            id="file-upload"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={isPosting}
            className="file-input"
            style={{ display: "none" }} // Hide the default input
          />
          <label htmlFor="file-upload" className="file-upload-label">
            {selectedFile ? selectedFile.name : "Choose an image/video"}
          </label>

          {previewImage && (
            <div className="image-preview-container">
              <img src={previewImage} alt="Preview" className="image-preview" />
              <button
                onClick={handleRemoveImage}
                className="remove-image-btn"
                disabled={isPosting}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <button
          className="post-button"
          onClick={handlePost}
          disabled={
            isPosting ||
            (!postText.trim() && !selectedFile) ||
            !Object.values(selectedPlatforms).some((v) => v) ||
            (selectedPlatforms.facebook && !selectedFacebookPageId) ||
            (selectedPlatforms.youtube &&
              (!selectedFile || !selectedFile.type.startsWith("video/")))
          }
        >
          {isPosting ? "Posting..." : "Post to Selected Platforms"}
        </button>

        {postStatus && (
          <div
            className={`status-message ${
              postStatus.includes("Error") ? "error" : "success"
            }`}
          >
            {postStatus}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
