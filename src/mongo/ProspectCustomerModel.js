import mongoose from 'mongoose';

const emailFoundSchema = new mongoose.Schema({
    email: { type: String, required: true },
    source_url: { type: String, default: '' },
    type: { type: String, default: 'general' },
    confidence: { type: Number, default: 0 },
}, { _id: false });

const prospectCustomerSchema = new mongoose.Schema({
    site_url: { type: String, required: true },
    domain: { type: String, required: true, unique: true, index: true },
    company_name: { type: String, default: '' },
    email: { type: String, default: '' },
    emails_found: { type: [emailFoundSchema], default: [] },
    score: { type: Number, default: 0 },
    score_reason: { type: String, default: '' },
    score_breakdown: { type: [String], default: [] },
    estimated_location_count: { type: Number, default: 0 },
    has_multiple_locations: { type: Boolean, default: false },
    has_store_locator: { type: Boolean, default: false },
    existing_locator: {
        type: String,
        enum: ['', 'storepoint.co', 'locatestore.com', 'stockist.co'],
        default: '',
    },
    store_locator_confidence: { type: Number, default: 0 },
    store_locator_evidence: { type: [String], default: [] },
    location_evidence: { type: [String], default: [] },
    analyzed_at: { type: Date, default: null },
    status: {
        type: String,
        enum: ['pending', 'done'],
        default: 'pending',
        index: true,
    },
}, { timestamps: true });

prospectCustomerSchema.index({ status: 1, createdAt: -1 });

let ProspectCustomerModel;
try {
    ProspectCustomerModel = mongoose.model('ProspectCustomerModel');
} catch {
    ProspectCustomerModel = mongoose.model('ProspectCustomerModel', prospectCustomerSchema);
}

export { ProspectCustomerModel };
