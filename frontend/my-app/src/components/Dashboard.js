import React, { useState, useEffect } from "react";
import axios from "axios";
import { getUserURN } from "../utils/linkedin";
import "../styles.css";

const Dashboard = () => {
  const [linkedinAccessToken, setLinkedinAccessToken] = useState(
    localStorage.getItem("linkedin_access_token") || ""
  );
  const [instagramAccessToken, setInstagramAccessToken] = useState(
    localStorage.getItem("instagram_access_token") || ""
  );
  const [facebookAccessToken, setFacebookAccessToken] = useState(
    localStorage.getItem("facebook_access_token") || ""
  );
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedFacebookPage, setSelectedFacebookPage] = useState("");

  const [youtubeToken, setYoutubeAccessToken] = useState(
    localStorage.getItem("youtube_access_token") || ""
  );
  const [twitterXAccessToken, setTwitterXAccessToken] = useState(
    localStorage.getItem("twitterX_access_token") || ""
  );
  const [postText, setPostText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    linkedin: false,
    instagram: false,
    facebook: false,
    youtube: false,
    twitterX: false,
  });

  useEffect(() => {
    const linkedinToken = localStorage.getItem("linkedin_access_token");
    const instagramToken = localStorage.getItem("instagram_access_token");
    const facebookToken = localStorage.getItem("facebook_access_token");
    const youtubeToken = localStorage.getItem("youtube_access_token");
    const twitterXToken = localStorage.getItem("twitterX_access_token");

    if (linkedinToken) {
      setLinkedinAccessToken(linkedinToken);
      setSelectedPlatforms((prev) => ({ ...prev, linkedin: true }));
    }

    if (instagramToken) {
      setInstagramAccessToken(instagramToken);
      setSelectedPlatforms((prev) => ({ ...prev, instagram: true }));
    }

    if (facebookToken) {
      setFacebookAccessToken(facebookToken);
      setSelectedPlatforms((prev) => ({ ...prev, facebook: true }));
      loadFacebookPages(facebookToken);
    }

    if (youtubeToken) {
      setYoutubeAccessToken(youtubeToken);
      setSelectedPlatforms((prev) => ({ ...prev, youtube: true }));
    }

    if (twitterXToken) {
      setTwitterXAccessToken(twitterXToken);
      setSelectedPlatforms((prev) => ({ ...prev, twitterX: true }));
    }

    // Handle route state (from Twitter callback)
    const locationState = window.history.state;
    if (locationState?.twitterConnected) {
      setPostStatus("Twitter connected successfully!");
      setTimeout(() => setPostStatus(""), 3000);
      // Clear the state
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (locationState?.twitterError) {
      setPostStatus(`Error: ${locationState.twitterError}`);
      setTimeout(() => setPostStatus(""), 5000);
      // Clear the state
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadFacebookPages = async (token) => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/facebook/pages",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setFacebookPages(response.data.pages || []);
      if (response.data.pages && response.data.pages.length > 0) {
        setSelectedFacebookPage(response.data.pages[0].id);
      }
    } catch (error) {
      console.error("Error loading Facebook pages:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("linkedin_access_token");
    localStorage.removeItem("instagram_access_token");
    localStorage.removeItem("instagram_user_id");
    localStorage.removeItem("facebook_access_token");
    localStorage.removeItem("facebook_pages");
    localStorage.removeItem("youtube_access_token");
    localStorage.removeItem("twitterX_access_token");
    setLinkedinAccessToken("");
    setInstagramAccessToken("");
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      console.log("Selected file type:", file.type);
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
  };

  const handlePlatformToggle = (platform) => {
    if (selectedPlatforms[platform]) {
      // It's currently checked, so we are unchecking = disconnect
      if (platform === "linkedin") {
        localStorage.removeItem("linkedin_access_token");
        setLinkedinAccessToken("");
      }
      if (platform === "instagram") {
        localStorage.removeItem("instagram_access_token");
        localStorage.removeItem("instagram_user_id");
        setInstagramAccessToken("");
      }
      if (platform === "facebook") {
        localStorage.removeItem("facebook_access_token");
        localStorage.removeItem("facebook_pages");
        setFacebookAccessToken("");
        setFacebookPages([]);
      }
      if (platform === "youtube") {
        localStorage.removeItem("youtube_access_token");
        localStorage.removeItem("youtube_refresh_token");
        localStorage.removeItem("youtube_channel_id");
        localStorage.removeItem("youtube_channel_name");
        setYoutubeAccessToken("");
      }
      if (platform === "twitterX") {
        localStorage.removeItem("twitterX_access_token");
        setTwitterXAccessToken("");
      }
    }
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const connectLinkedIn = () => {
    const CLIENT_ID = "77igg9177iv3cg";
    const REDIRECT_URI = "http://localhost:3000/auth/linkedin/callback";
    const scope = "openid profile email w_member_social";
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(
      scope
    )}&state=${state}`;
  };

  const connectInstagram = () => {
    const CLIENT_ID = "2056002844893910";
    const REDIRECT_URI = "http://localhost:3000/auth/instagram/callback";
    const scope =
      "pages_show_list business_management instagram_basic instagram_content_publish";
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(
      scope
    )}&response_type=code&state=${state}`;
  };

  const connectFacebook = () => {
    const CLIENT_ID = "1057966605784043";
    const REDIRECT_URI = "http://localhost:3000/auth/facebook/callback";
    const scope = "pages_manage_posts,pages_read_engagement,pages_show_list";
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;
  };

  const connectYouTube = () => {
    window.location.href = "http://localhost:8000/auth/youtube";
  };

  const connectTwitterX = async () => {
    try {
      // Clear any existing tokens before starting new auth
      localStorage.removeItem("twitterX_access_token");
      localStorage.removeItem("twitterX_access_secret");

      const response = await axios.get("http://localhost:8000/auth/twitter");
      console.log("Twitter OAuth response:", response);

      if (response.data && response.data.authUrl) {
        // Redirect to Twitter auth
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

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/upload-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Uploaded image URL:", response.data.imageUrl);
      return response.data.imageUrl;
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handlePost = async () => {
    if (!postText.trim() && !selectedFile) {
      setPostStatus("Please enter text or select an image to post");
      return;
    }

    if (
      !selectedPlatforms.linkedin &&
      !selectedPlatforms.instagram &&
      !selectedPlatforms.facebook &&
      !selectedPlatforms.youtube &&
      !selectedPlatforms.twitterX
    ) {
      setPostStatus("Please select at least one platform to post to");
      return;
    }

    if (selectedPlatforms.facebook && !selectedFacebookPage) {
      setPostStatus("Please select a Facebook page to post to");
      return;
    }

    setIsPosting(true);
    setPostStatus("Posting to selected platforms...");

    try {
      let imageUrl = null;

      // Upload image if needed for any platform
      if (
        selectedFile &&
        (selectedPlatforms.instagram ||
          selectedPlatforms.facebook ||
          selectedPlatforms.linkedin ||
          selectedPlatforms.twitterX)
      ) {
        imageUrl = await handleImageUpload(selectedFile);
      }

      if (selectedPlatforms.linkedin && linkedinAccessToken) {
        const userUrn = await getUserURN(linkedinAccessToken);
        if (!userUrn) {
          setPostStatus(
            "Failed to get LinkedIn user information. Please login again."
          );
          setIsPosting(false);
          return;
        }

        await axios.post("http://localhost:8000/api/post-to-linkedin", {
          accessToken: linkedinAccessToken,
          text: postText,
          userUrn,
          imageUrl: imageUrl,
        });
      }

      if (selectedPlatforms.instagram && instagramAccessToken && imageUrl) {
        await axios.post("http://localhost:8000/api/instagram/post", {
          accessToken: instagramAccessToken,
          imageUrl,
          caption: postText,
        });
      }

      if (selectedPlatforms.facebook && facebookAccessToken) {
        try {
          await axios.post("http://localhost:8000/api/facebook/post", {
            userAccessToken: facebookAccessToken,
            pageId: selectedFacebookPage,
            message: postText,
            imageUrl,
            link: null,
            picture: null,
          });
        } catch (error) {
          console.error(
            "Facebook post failed:",
            error.response?.data || error.message
          );
        }
      }

      if (selectedPlatforms.youtube && youtubeToken && selectedFile) {
        const formData = new FormData();
        formData.append("video", selectedFile);
        formData.append("title", postText);

        await axios.post(
          "http://localhost:8000/api/upload-youtube-video",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${youtubeToken}`,
            },
          }
        );
      }

      if (selectedPlatforms.twitterX && twitterXAccessToken) {
        try {
          await axios.post(
            "http://localhost:8000/api/twitter/post",
            {
              content: postText,
              mediaUrls: imageUrl ? [imageUrl] : [],
            },
            {
              withCredentials: true,
            }
          );
        } catch (error) {
          console.error("Twitter post failed:", error);
          setPostStatus(
            `Twitter Error: ${
              error.response?.data?.message || "Failed to post"
            }`
          );
        }
      }

      setPostStatus("Successfully posted to selected platforms!");
      setPostText("");
      setSelectedFile(null);
      setPreviewImage(null);
    } catch (err) {
      console.error(err);
      setPostStatus(`Error: ${err.response?.data?.error || "Failed to post"}`);
    } finally {
      setIsPosting(false);
      setTimeout(() => setPostStatus(""), 5000);
    }
  };

  const handleDisconnect = (platform) => {
    if (platform === "linkedin") {
      localStorage.removeItem("linkedin_access_token");
      setLinkedinAccessToken("");
    } else if (platform === "instagram") {
      localStorage.removeItem("instagram_access_token");
      localStorage.removeItem("instagram_user_id");
      setInstagramAccessToken("");
    } else if (platform === "facebook") {
      localStorage.removeItem("facebook_access_token");
      localStorage.removeItem("facebook_pages");
      setFacebookAccessToken("");
      setFacebookPages([]);
      setSelectedFacebookPage("");
    } else if (platform === "youtube") {
      localStorage.removeItem("youtube_access_token");
      localStorage.removeItem("youtube_refresh_token");
      localStorage.removeItem("youtube_channel_id");
      localStorage.removeItem("youtube_channel_name");
      setYoutubeAccessToken("");
    } else if (platform === "twitterX") {
      localStorage.removeItem("twitterX_access_token");
      setTwitterXAccessToken("");
    }

    setSelectedPlatforms((prev) => ({
      ...prev,
      [platform]: false,
    }));
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Social Media Dashboard</h2>
        {(linkedinAccessToken ||
          instagramAccessToken ||
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
          {/* LinkedIn Platform */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.linkedin}
                  onChange={() => handlePlatformToggle("linkedin")}
                  disabled={!linkedinAccessToken}
                />
                LinkedIn{" "}
                {linkedinAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className="connect-button"
              onClick={
                linkedinAccessToken
                  ? () => handleDisconnect("linkedin")
                  : connectLinkedIn
              }
            >
              {linkedinAccessToken ? "Disconnect LinkedIn" : "Connect LinkedIn"}
            </button>
          </div>

          {/* Instagram Platform */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.instagram}
                  onChange={() => handlePlatformToggle("instagram")}
                  disabled={!instagramAccessToken}
                />
                Instagram{" "}
                {instagramAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className="connect-button instagram-connect"
              onClick={
                instagramAccessToken
                  ? () => handleDisconnect("instagram")
                  : connectInstagram
              }
            >
              {instagramAccessToken
                ? "Disconnect Instagram"
                : "Connect Instagram"}
            </button>
          </div>

          {/* Facebook Platform */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.facebook}
                  onChange={() => handlePlatformToggle("facebook")}
                  disabled={!facebookAccessToken}
                />
                Facebook{" "}
                {facebookAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className="connect-button facebook-connect"
              onClick={
                facebookAccessToken
                  ? () => handleDisconnect("facebook")
                  : connectFacebook
              }
            >
              {facebookAccessToken ? "Disconnect Facebook" : "Connect Facebook"}
            </button>
          </div>

          {/* YouTube Platform */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.youtube}
                  onChange={() => handlePlatformToggle("youtube")}
                  disabled={!youtubeToken}
                />
                YouTube {youtubeToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className="youtube-button"
              onClick={
                youtubeToken
                  ? () => handleDisconnect("youtube")
                  : connectYouTube
              }
            >
              {youtubeToken ? "Disconnect" : "Connect"} YouTube
            </button>
          </div>

          {/* Twitter (X) Platform */}
          <div className="platform-item">
            <div className="platform-status">
              <label>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.twitterX}
                  onChange={() => handlePlatformToggle("twitterX")}
                  disabled={!twitterXAccessToken}
                />
                TwitterX{" "}
                {twitterXAccessToken ? "(Connected)" : "(Not Connected)"}
              </label>
            </div>
            <button
              className="twitter-button"
              onClick={
                twitterXAccessToken
                  ? () => handleDisconnect("twitterX")
                  : connectTwitterX
              }
            >
              {twitterXAccessToken ? "Disconnect TwitterX" : "Connect TwitterX"}
            </button>
          </div>
        </div>

        {/* Facebook Page Selection */}
        {facebookAccessToken && facebookPages.length > 0 && (
          <div className="facebook-page-selection">
            <h4>Select Facebook Page</h4>
            <select
              value={selectedFacebookPage}
              onChange={(e) => setSelectedFacebookPage(e.target.value)}
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
          />
          <label htmlFor="file-upload" className="file-upload-label">
            {selectedFile ? selectedFile.name : "Choose an image/video"}
          </label>
          {selectedPlatforms.instagram && !selectedFile && (
            <div className="image-required-notice">
              * An image is required for Instagram posts
            </div>
          )}
          {previewImage && (
            <div className="image-preview-container">
              <img src={previewImage} alt="Preview" className="image-preview" />
              <button
                onClick={handleRemoveImage}
                className="remove-image-btn"
                disabled={isPosting}
              >
                Remove Image or Videos
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
            (!selectedPlatforms.linkedin &&
              !selectedPlatforms.instagram &&
              !selectedPlatforms.facebook &&
              !selectedPlatforms.youtube &&
              !selectedPlatforms.twitterX) ||
            (selectedPlatforms.instagram && !selectedFile) ||
            (selectedPlatforms.facebook && !selectedFacebookPage) ||
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
};

export default Dashboard;