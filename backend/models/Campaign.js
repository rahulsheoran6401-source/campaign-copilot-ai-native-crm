import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  audienceSize: { type: Number, default: 0 },
  channel: { type: String, enum: ['WhatsApp', 'Email', 'SMS'], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Scheduled', 'Active', 'Completed', 'Failed'], default: 'Draft' },
}, { timestamps: true });

export default mongoose.model('Campaign', campaignSchema);
