import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  email: { type: String, required: false, default: '' },
  reference: { type: String, required: true, index: true },

  // Message content
  topic: { type: String, required: false, default: '' },
  message: { type: String, required: true },

  // Context captured at submit time (helps the team triage faster)
  plan: { type: String, required: false, default: '' },
  page_url: { type: String, required: false, default: '' },

  // Triage
  status: { type: String, required: false, default: 'open' },
}, { timestamps: true });

let SupportTicketModel;
try {
  SupportTicketModel = mongoose.model('SupportTicketModel');
} catch {
  SupportTicketModel = mongoose.model('SupportTicketModel', supportTicketSchema);
}

export { SupportTicketModel };
