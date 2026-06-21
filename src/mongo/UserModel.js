import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  provider: { type: String, required: true, default: 'google' },
  provider_id: { type: String, required: false },
  created_at: { type: String, required: false },
  last_login_at: { type: String, required: false },

  // lemonsqueezy.com payment
  ls_customer_id: { type: String, required: false, default: '' },       // LemonSqueezy customer ID (e.g. "1234567")
  ls_subscription_id: { type: String, required: false, default: '' },   // LemonSqueezy subscription ID (e.g. "sub_abc123")
  ls_order_id: { type: String, required: false, default: '' },          // LemonSqueezy order ID — first purchase
  ls_product_id: { type: String, required: false, default: '' },        // LemonSqueezy product ID
  ls_variant_id: { type: String, required: false, default: '' },        // LemonSqueezy variant ID — maps to plan tier
  plan: { type: String, required: false, default: 'free' },             // free | pro | business
  status: { type: String, required: false, default: 'active' },         // active | cancelled | past_due | paused | expired
  plan_started: { type: String, required: false, default: '' },         // subscription created_at — empty on the free plan
  renewal_date: { type: String, required: false, default: '' },         // from LemonSqueezy webhook
  trial_ends_at: { type: String, required: false, default: '' },        // if you offer a free trial

});

let UserModel;
try {
  UserModel = mongoose.model('UserModel');
} catch {
  UserModel = mongoose.model('UserModel', userSchema);
}

export { UserModel };
