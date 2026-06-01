import mongoose from 'mongoose';

const locatorSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },
    views: { type: Number, required: false, default: 0 },

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
    country: { type: String, required: true, default: '' },
    // Location on Map
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    // Business Hours
    location_status: { type: String, required: true },
    hours: { type: Object, required: true },
    holidays: { type: Array, required: false, default: [] },
    // Contact & Links
    phone: { type: String, required: false, default: '' },
    email: { type: String, required: false, default: '' },
    website: { type: String, required: false, default: '' },
    // Location Settings
    published: { type: Boolean, required: true, default: true },
    show_opening_hours: { type: Boolean, required: true, default: false },
    custom_notes: { type: String, required: false, default: '' },




    // CUSTOM UI
    settings: {
        background: { type: String, default: '#ffffff' },
        text_color: { type: String, default: '#000000' },
        font_family: { type: String, default: 'system-ui, sans-serif' },
        font_size: { type: Number, default: 14 },

        search: {
            border: { type: String, default: 'rounded' },
            background: { type: String, default: '#185FA5' },
            label: { type: String, default: 'Search' },
            text_color: { type: String, default: '#ffffff' },
        },
        pin: {
            color: { type: String, default: '#185FA5' },
            image: { type: String, default: null },
        },
        zoom: {
            border: { type: String, default: 'rounded' },
            background: { type: String, default: '#ffffff' },
            text_color: { type: String, default: '#1f1f1f' },
        },
        searchInput: {
            border: { type: String, default: 'rounded' },
            background: { type: String, default: '#ffffff' },
            text_color: { type: String, default: '#1f1f1f' },
            placeholder: { type: String, default: 'Enter a location' },
        },
        filter: {
            border: { type: String, default: 'rounded' },
            background: { type: String, default: '#f1f1f1' },
            label: { type: String, default: 'Filters' },
            text_color: { type: String, default: '#1f1f1f' },
        },
        resultItem: {
            active_border_color: { type: String, default: '#185FA5' },
            border_color: { type: String, default: '#e4e4e4' },
            background: { type: String, default: '#ffffff' },
        },
        getDirections: {
            border: { type: String, default: 'rounded' },
            background: { type: String, default: '#185FA5' },
            label: { type: String, default: 'Get Directions' },
            text_color: { type: String, default: '#ffffff' },
        },
        viewLocation: {
            border: { type: String, default: 'rounded' },
            background: { type: String, default: '#ffffff' },
            label: { type: String, default: 'View Location' },
            text_color: { type: String, default: '#185FA5' },
        },
    },

}, { timestamps: true },);

let LocatorModel;
try {
  LocatorModel = mongoose.model('LocatorModel');
} catch {
  LocatorModel = mongoose.model('LocatorModel', locatorSchema);
}

export { LocatorModel };
