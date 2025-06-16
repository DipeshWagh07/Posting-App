import axios from 'axios';

export const getInstagramUserProfile = async (accessToken) => {
  try {
    if (!accessToken) {
      console.error("Access token is missing.");
      return null;
    }

    const res = await axios.post('http://localhost:8000/api/instagram/userinfo', {
      accessToken,
    });

    return res.data;
  } catch (err) {
    console.error("Error fetching Instagram user profile:", err.response?.data || err.message);
    return null;
  }
};