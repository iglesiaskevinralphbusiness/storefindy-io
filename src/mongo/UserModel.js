import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  provider: { type: String, required: true, default: 'google' },
  provider_id: { type: String, required: false },
  created_at: { type: String, required: false },
  last_login_at: { type: String, required: false },
});

let UserModel;
try {
  UserModel = mongoose.model('UserModel');
} catch {
  UserModel = mongoose.model('UserModel', userSchema);
}

export { UserModel };
