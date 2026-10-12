import express from 'express';
import axios from 'axios';

const chatbotRouter = express.Router();
const CHATBOT_SERVICE_URL = process.env.CHATBOT_SERVICE_URL || 'http://127.0.0.1:8000';

chatbotRouter.post('/chat', async (req, res, next) => {
  try {
    const authData = typeof req.auth === 'function' ? req.auth() : null;
    const userId = authData?.userId || req.body.user_id || 'user_guest';

    const payload = {
      ...req.body,
      user_id: userId,
      application_id: 'quickai',
    };

    const response = await axios.post(`${CHATBOT_SERVICE_URL}/api/v1/chat`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(502).json({
      success: false,
      message: 'Chatbot service unavailable',
      error: err.message,
    });
  }
});

chatbotRouter.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${CHATBOT_SERVICE_URL}/health`, { timeout: 4000 });
    return res.json(response.data);
  } catch (err) {
    return res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

chatbotRouter.get('/info', async (req, res) => {
  try {
    const response = await axios.get(`${CHATBOT_SERVICE_URL}/api/v1/info`, { timeout: 4000 });
    return res.json(response.data);
  } catch (err) {
    return res.status(503).json({ error: err.message });
  }
});

export default chatbotRouter;
