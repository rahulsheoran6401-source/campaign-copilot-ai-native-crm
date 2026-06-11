import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Callback URL for the CRM
const CRM_CALLBACK_URL = process.env.CRM_CALLBACK_URL || 'http://localhost:5000/api/webhook/channel-receipt';

app.post('/api/send', (req, res) => {
  const { recipient, message, channel, logId } = req.body;
  
  if (!recipient || !message || !channel || !logId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Acknowledge receipt
  res.status(202).json({ status: 'queued', logId });

  // Simulate processing delay and callback
  setTimeout(async () => {
    // Generate random status
    const statuses = ['Delivered', 'Failed', 'Opened', 'Read', 'Clicked'];
    // Weight towards positive statuses
    const randomStatus = Math.random();
    let finalStatus = 'Delivered';
    if (randomStatus > 0.95) finalStatus = 'Failed';
    else if (randomStatus > 0.85) finalStatus = 'Converted';
    else if (randomStatus > 0.7) finalStatus = 'Clicked';
    else if (randomStatus > 0.5) finalStatus = 'Read';
    else if (randomStatus > 0.3) finalStatus = 'Opened';

    try {
      await axios.post(CRM_CALLBACK_URL, {
        logId,
        status: finalStatus,
        timestamp: new Date()
      });
      console.log(`Sent callback for ${logId} with status ${finalStatus}`);
    } catch (error) {
      console.error(`Failed to send callback to CRM for ${logId}:`, error.message);
    }
  }, Math.random() * 2000 + 1000); // 1-3 seconds delay
});

app.listen(PORT, () => {
  console.log(`Channel Service running on port ${PORT}`);
});
