import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import ScheduledPost from '../models/ScheduledPost.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

export const schedulePost = async (post) => {
  const { scheduledTime, _id } = post;
  const now = new Date();
  const postTime = new Date(scheduledTime);
  const delay = postTime - now;

  if (delay <= 0) {
    await processScheduledPost(post);
    return;
  }

  setTimeout(async () => {
    try {
      await processScheduledPost(post);
    } catch (error) {
      console.error(`Error processing scheduled post ${_id}:`, error);
      await ScheduledPost.findByIdAndUpdate(_id, { status: 'failed' });
    }
  }, delay);
};

const processScheduledPost = async (post) => {
  const { _id, text, fileUrl, platforms, platformTokens, selectedFacebookPageId } = post;

  try {
    await ScheduledPost.findByIdAndUpdate(_id, { status: 'processing' });

    const formData = new FormData();
    formData.append('text', text);
    formData.append('platforms', JSON.stringify(platforms));
    formData.append('platformTokens', JSON.stringify(platformTokens));
    formData.append('selectedFacebookPageId', selectedFacebookPageId);

    if (fileUrl) {
      const fileStream = fs.createReadStream(`.${fileUrl}`);
      formData.append('file', fileStream);
    }

    await axios.post(`${API_BASE_URL}/api/process-scheduled-post`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Length': formData.getLengthSync()
      }
    });

    await ScheduledPost.findByIdAndUpdate(_id, { status: 'completed' });
  } catch (error) {
    console.error(`Error posting scheduled content for post ${_id}:`, error);
    await ScheduledPost.findByIdAndUpdate(_id, { status: 'failed' });
    throw error;
  }
};

export const initScheduler = async () => {
  const pendingPosts = await ScheduledPost.find({ status: 'pending' });
  for (const post of pendingPosts) {
    await schedulePost(post);
  }
};