import mongoose from 'mongoose';

const viewsSchema = new mongoose.Schema({
    date_id: { type: String, required: true },
    view_count: { type: Number, required: true },
    mobile_count: { type: Number, default: 0 },
    tablet_count: { type: Number, default: 0 },
    desktop_count: { type: Number, default: 0 },
}, { _id: false, timestamps: true })

const searchesSchema = new mongoose.Schema({
    geo_label: { type: String, required: true },
    query: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
}, { _id: false, timestamps: true });

const locatorSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },

    // ANALYTICS
    views: { type: [viewsSchema], default: [] }, // [ { date_id: '2026-06-25', view_count: 32, mobile_count: 10, tablet_count: 10, desktop_count: 12 } ]
    searches: { type: [searchesSchema], default: [] },
    
    // SETTINGS
    // basic information
    name: { type: String, required: true },
    description: { type: String, required: false, default: '' },
    default_language: { type: String, required: true },
    // default map view
    default_country: { type: String, required: false, default: 'us' },
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
    powered_by_storefindy: { type: Boolean, required: false, default: true },
    // customize settings
    show_map_radius_indicator: { type: Boolean, required: false, default: false },
    show_map_pin_number: { type: Boolean, required: false, default: true },
    form_style: { type: String, required: false, default: 'style-1' },
    focused_zoom: { type: Boolean, required: false, default: true },

    // CUSTOM UI
    settings: {
        height: { type: String, default: 'large' },
        background: { type: String, default: '#ffffff' },
        text_color: { type: String, default: '#000000' },
        font_family: { type: String, default: 'system-ui, sans-serif' },
        font_size: { type: Number, default: 14 },
        border: { type: String, default: 'none' },
        border_color: { type: String, default: '#000' },

        searchInput: {
            border: { type: String, default: 'square' },
            background: { type: String, default: '#ffffff' },
            text_color: { type: String, default: '#1f1f1f' },
            border_color: { type: String, default: '#000' },
            placeholder: { type: String, default: 'Enter city, state, or postal code' },
        },
        search: { // search button
            border: { type: String, default: 'square' },
            background: { type: String, default: '#000' },
            label: { type: String, default: 'Search' },
            text_color: { type: String, default: '#fff' },
            icon: { type: String, default: 'magnifying-glass' },
        },
        filter: { // filter button
            border: { type: String, default: 'square' },
            background: { type: String, default: '#000' },
            label: { type: String, default: '' },
            text_color: { type: String, default: '#fff' },
            icon: { type: String, default: 'funnel' },
        },
        filterList: {
            border_color: { type: String, default: '#e4e4e4' },
            background: { type: String, default: '#fff' },
            text_color: { type: String, default: '#000' },
            active_background: { type: String, default: '#e4e4e4' },
            active_text_color: { type: String, default: '#000' },
        },
        resultItem: {
            active_border_color: { type: String, default: '#185FA5' },
            active_background: { type: String, default: '#ffffff' },
            border: { type: String, default: 'square' },
            border_color: { type: String, default: '#e4e4e4' },
            background: { type: String, default: '#ffffff' },
        },
        getDirections: {
            border: { type: String, default: 'square' },
            background: { type: String, default: '#000' },
            label: { type: String, default: 'Get Directions' },
            text_color: { type: String, default: '#ffffff' },
            icon: { type: String, default: '' },
        },
        viewLocation: {
            border: { type: String, default: 'square' },
            background: { type: String, default: '#000' },
            label: { type: String, default: 'View Location' },
            text_color: { type: String, default: '#ffffff' },
            icon: { type: String, default: '' },
        },
        pin: {
            type: { type: String, default: 'standard' }, // standard, custom
            color: { type: String, default: '#000' },
            size: { type: String, default: 'medium' },
            text_color: { type: String, default: '#ffffff' },
            text_size: { type: Number, default: 12 },
            image: { type: String, default: '' },
        },
        mobileView: {
            background: { type: String, default: '#ffffff' },
            text_color: { type: String, default: '#000000' },
            active_border_color: { type: String, default: '#000000' },
            active_background: { type: String, default: '#ffffff' },
        }
    },

}, { timestamps: true },);

let LocatorModel;
try {
  LocatorModel = mongoose.model('LocatorModel');
} catch {
  LocatorModel = mongoose.model('LocatorModel', locatorSchema);
}

export { LocatorModel };
