// import express from 'express';
// import axios from 'axios';
// import { getInstagramUserProfile } from '../utils/instagramAuth.js';

// const router = express.Router();

// router.post('/userinfo', async (req, res) => {
//   const { accessToken } = req.body;

//   try {
//     const userProfile = await getInstagramUserProfile(accessToken);
//     res.json(userProfile);
//   } catch (error) {
//     console.error('Error fetching Instagram user info:', error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to retrieve user information' });
//   }
// });

// // Add endpoint to post to Instagram
// router.post('/post', async (req, res) => {
//   try {
//     const { accessToken, imageUrl, caption } = req.body;

//     if (!accessToken || !imageUrl) {
//       return res.status(400).json({ error: 'Missing required parameters' });
//     }


//     const response = await axios.post(
//       `https://graph.facebook.com/v22.0/me/media`,
//       {
//         image_url: imageUrl,
//         caption: caption || '',
//         access_token: accessToken
//       }
//     );

//     res.json({ success: true, data: response.data });
//   } catch (error) {
//     console.error('Error posting to Instagram:', error.response?.data || error.message);
//     res.status(500).json({ 
//       error: 'Failed to post to Instagram', 
//       details: error.response?.data || error.message 
//     });
//   }
// });

// export default router;