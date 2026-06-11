import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  totalSpend: { type: Number, default: 0 },
  lastOrderDate: { type: Date },
  preferredChannel: { type: String, enum: ['WhatsApp', 'Email', 'SMS'], default: 'Email' },
  churnRisk: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
