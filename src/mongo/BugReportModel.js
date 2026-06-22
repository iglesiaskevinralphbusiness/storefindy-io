import mongoose from 'mongoose';

const systemInfoSchema = new mongoose.Schema({
  browser: { type: String, required: false, default: '' },
  os: { type: String, required: false, default: '' },
  screen_resolution: { type: String, required: false, default: '' },
  user_agent: { type: String, required: false, default: '' },
  plan: { type: String, required: false, default: '' },
  app_version: { type: String, required: false, default: '' },
}, { _id: false });

const bugReportSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  email: { type: String, required: false, default: '' },
  reference: { type: String, required: true, index: true },

  // Report content
  subject: { type: String, required: true },
  severity: { type: String, required: false, default: 'medium' },
  affected_feature: { type: String, required: false, default: '' },
  frequency: { type: String, required: false, default: '' },
  description: { type: String, required: true },
  expected_behavior: { type: String, required: false, default: '' },
  steps: { type: [String], required: false, default: [] },
  screenshots: { type: [String], required: false, default: [] },

  system_info: { type: systemInfoSchema, required: false, default: () => ({}) },

  // Triage
  status: { type: String, required: false, default: 'open' },

}, { timestamps: true });

let BugReportModel;
try {
  BugReportModel = mongoose.model('BugReportModel');
} catch {
  BugReportModel = mongoose.model('BugReportModel', bugReportSchema);
}

export { BugReportModel };
