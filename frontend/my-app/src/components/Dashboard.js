import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
import '../styles.css';

const useTikTokAuth = () => {
  const [tiktokStatus, setTiktokStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const navigate = useNavigate();

  const connectTikTok = async () => {
    try {
      setIsLoading(true);
      setTiktokStatus('Connecting to TikTok...');
      window.location.href = 'https://postingapp-g0p1.onrender.com/auth/tiktok';
    } catch (error) {
      setTiktokStatus(`TikTok connection failed: ${error.message}`);
      setIsLoading(false);
      throw error;
    }
  };

  const disconnectTikTok = async () => {
    try {
      setIsLoading(true);
      setTiktokStatus('Disconnecting from TikTok...');
      
      await axios.post(
        'https://postingapp-g0p1.onrender.com/auth/tiktok/logout', 
        {}, 
        { withCredentials: true }
      );
      
      setTiktokStatus('Disconnected from TikTok');
      return true;
    } catch (error) {
      setTiktokStatus(`Failed to disconnect: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkTikTokAuth = async () => {
    try {
      const response = await axios.get(
        'https://postingapp-g0p1.onrender.com/auth/tiktok/check',
        { withCredentials: true }
      );
      return response.data.authenticated;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  };

  return {
    connectTikTok,
    disconnectTikTok,
    checkTikTokAuth,
    tiktokStatus,
    isLoading,
    setTiktokStatus // Make sure this is included in the return object
  };
};

const TikTokPostForm = ({ isConnected, onPost }) => {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [postStatus, setPostStatus] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setPostStatus('Please select a video file');
      return;
    }

    try {
      setIsPosting(true);
      setPostStatus('Uploading video...');
      
      await onPost(caption, file, (progress) => {
        setUploadProgress(progress);
      });

      setPostStatus('Posted successfully!');
      setCaption('');
      setFile(null);
      setUploadProgress(0);
    } catch (error) {
      setPostStatus(`Failed to post: ${error.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="post-form">
      <h3>Post to TikTok</h3>
      <form onSubmit={handleSubmit}>
        <textarea 
          placeholder="Enter your caption here..." 
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={150}
          disabled={!isConnected || isPosting}
        />
        
        <input 
          type="file" 
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
          disabled={!isConnected || isPosting}
        />
        
        {file && (
          <div className="file-info">
            <p>Selected: {file.name}</p>
            <p>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        )}
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-bar">
            <div style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
        
        <button 
          type="submit"
          disabled={!isConnected || isPosting || !file}
        >
          {isPosting ? 'Posting...' : 'Post to TikTok'}
        </button>
        
        {postStatus && (
          <div className={`status-message ${
            postStatus.includes("Failed") ? "error" : "success"
          }`}>
            {postStatus}
          </div>
        )}
      </form>
    </div>
  );
};

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const {
    connectTikTok,
    disconnectTikTok,
    checkTikTokAuth,
    tiktokStatus,
    isLoading,
    setTiktokStatus
  } = useTikTokAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const error = params.get('error');

    if (authStatus === 'success') {
      setTiktokStatus('TikTok connected successfully!');
      setIsConnected(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setTiktokStatus(`TikTok connection failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const checkAuth = async () => {
      try {
        const authenticated = await checkTikTokAuth();
        setIsConnected(authenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    
    checkAuth();
  }, [checkTikTokAuth, setTiktokStatus]);

  const handleTikTokAction = async () => {
    try {
      if (isConnected) {
        await disconnectTikTok();
        setIsConnected(false);
      } else {
        await connectTikTok();
      }
    } catch (error) {
      console.error('TikTok action failed:', error);
    }
  };

  const handlePost = async (caption, file, progressCallback) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      withCredentials: true,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        progressCallback(percentCompleted);
      }
    };

    const uploadResponse = await axios.post(
      'https://postingapp-g0p1.onrender.com/api/tiktok/upload',
      formData,
      config
    );

    const postResponse = await axios.post(
      'https://postingapp-g0p1.onrender.com/api/tiktok/post',
      {
        caption,
        videoId: uploadResponse.data.videoId
      },
      { withCredentials: true }
    );

    return postResponse.data;
  };

  return (
    <div className="dashboard-container">
      <div className="platform-item">
        <div className="platform-status">
          <label>
            <input
              type="checkbox"
              checked={isConnected}
              onChange={handleTikTokAction}
              disabled={isLoading}
            />
            TikTok {isConnected ? "(Connected)" : "(Not Connected)"}
          </label>
          
          {tiktokStatus && (
            <div className={`status-message ${
              tiktokStatus.includes("failed") ? "error" : "success"
            }`}>
              {tiktokStatus}
            </div>
          )}
        </div>
        
        <button
          className={`connect-button tiktok-button ${
            isConnected ? "connected" : ""
          }`}
          onClick={handleTikTokAction}
          disabled={isLoading}
        >
          {isLoading 
            ? (isConnected ? "Disconnecting..." : "Connecting...") 
            : (isConnected ? "Disconnect" : "Connect TikTok")}
        </button>
      </div>

      <TikTokPostForm 
        isConnected={isConnected} 
        onPost={handlePost}
      />
    </div>
  );
};

export default Dashboard;