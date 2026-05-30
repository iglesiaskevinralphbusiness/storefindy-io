import mongoose from 'mongoose';

const locatorSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },
    views: { type: Number, required: false, default: 0 },
    
    // SETTINGS
    // basic information
    name: { type: String, required: true },
    description: { type: String, required: false, default: '' },
    default_language: { type: String, required: true },
    // default map view
    default_country: { type: String, required: false, default: '' },
    default_zoom_level: { type: Number, required: true },
    // search settings
    search_radius: { type: Number, required: true },
    maximum_results_shown: { type: Number, required: true },
    // filters
    filters: { type: Array, required: false, default: [] },
    // widget features
    show_search_bar: { type: Boolean, required: false, default: true },
    detect_location: { type: Boolean, required: false, default: true },
    show_filters: { type: Boolean, required: false, default: false },
    show_radius: { type: Boolean, required: false, default: false },
    show_store_list: { type: Boolean, required: false, default: true },
    show_directions: { type: Boolean, required: false, default: true },
    show_store_hours: { type: Boolean, required: false, default: false },
    show_phone_number: { type: Boolean, required: false, default: false },
    show_website_link: { type: Boolean, required: false, default: false },
    powered_by_storefindy: { type: Boolean, required: false, default: true },


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
