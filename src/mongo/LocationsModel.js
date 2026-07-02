import mongoose from 'mongoose';

const daySchema = new mongoose.Schema({
    enabled: { type: Boolean, required: true },
    open: { type: String, required: true },
    close: { type: String, required: true },
}, { _id: false });

const socialMediaLinkSchema = new mongoose.Schema({
    code: { type: String, required: true },
    link: { type: String, required: true },
}, { _id: false });

const holidaySchema = new mongoose.Schema({
    from:    { type: String, required: true },
    to:      { type: String, required: true },
    enabled: { type: Boolean, required: true },
    open:    { type: String, required: true },
    close:   { type: String, required: true },
}, { _id: false });

const viewsSchema = new mongoose.Schema({
  date_id: { type: String, required: true },
  click_count: { type: Number, default: 0 },
  view_count: { type: Number, default: 0 },
}, { _id: false, timestamps: true });


const locationSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },
    views: { type: [viewsSchema], default: [] },

    // Basic Information
    name: { type: String, required: true },
    locator_id: { type: String, required: true, index: true },
    filters: { type: Array, required: false, default: [] },
    description: { type: String, required: false, default: '' },
    // Address Details
    street: { type: String, required: false, default: '' },
    city: { type: String, required: true, default: '' },
    state: { type: String, required: true, default: '' },
    postal: { type: String, required: false, default: '' },
    country: { type: String, required: true, default: 'us' },
    // Location on Map
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    // Business Hours
    location_status: { type: String, required: true },
    hours: {
      Mon: { type: daySchema, required: true },
      Tue: { type: daySchema, required: true },
      Wed: { type: daySchema, required: true },
      Thu: { type: daySchema, required: true },
      Fri: { type: daySchema, required: true },
      Sat: { type: daySchema, required: true },
      Sun: { type: daySchema, required: true },
    },
    holidays: { type: [holidaySchema], default: [] },
    // Contact & Links
    phone: { type: String, required: false, default: '' },
    email: { type: String, required: false, default: '' },
    website: { type: String, required: false, default: '' },
    view_location_url: { type: String, required: false, default: '' },
    social_media_links: { type: [socialMediaLinkSchema], required: false, default: [] }, // { code: 'facebook', link: 'https://www.facebook.com/yourstore' }
    // Location Settings
    published: { type: Boolean, required: true, default: true },
    show_opening_hours: { type: Boolean, required: true, default: false },
    custom_notes: { type: String, required: false, default: '' },

}, { timestamps: true },);

let LocationModel;
try {
  LocationModel = mongoose.model('LocationModel');
} catch {
  LocationModel = mongoose.model('LocationModel', locationSchema);
}

export { LocationModel };
