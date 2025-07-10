import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function TikTokCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      if (params.has('access_token')) {
        // Success case
        const accessToken = params.get('access_token');
        const openId = params.get('open_id');
        
        localStorage.setItem('tiktok_access_token', accessToken);
        localStorage.setItem('tiktok_open_id', openId);
        
        navigate('/dashboard', { 
          replace: true,
          state: { 
            message: 'TikTok connected successfully!' 
          } 
        });
      } 
      else if (hashParams.has('error')) {
        // Error case
        const error = decodeURIComponent(hashParams.get('error'));
        console.error('TikTok auth error:', error);
        
        navigate('/dashboard', { 
          replace: true,
          state: { 
            error: `TikTok connection failed: ${error}` 
          } 
        });
      }
      else {
        // No token or error - unexpected state
        console.error('Unexpected callback state');
        navigate('/dashboard', { 
          replace: true,
          state: { 
            error: 'TikTok connection failed: Unknown error' 
          } 
        });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        textAlign: 'center',
        padding: '2rem',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#333' }}>Processing TikTok Connection</h2>
        <p style={{ color: '#666' }}>Please wait while we connect your account...</p>
        <div className="spinner" style={{ marginTop: '1rem' }}></div>
      </div>
    </div>
  );
}

export default TikTokCallback;