import mongoose from 'mongoose';

// One document per account per UTC day — the counter behind the /api/v1 daily
// rate limit. Kept out of UserModel on purpose: the count is written on every
// single API request, and folding a hot counter into the user document would
// mean rewriting (and re-indexing) a document that is otherwise read-mostly.
//
// The `{ user_id, date }` unique index is what makes the counter safe under
// concurrency: the increment is a single atomic upsert, so two requests landing
// on different serverless instances can never both read-then-write the same
// stale count.
const apiUsageSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },
    date: { type: String, required: true },                  // UTC day, 'YYYY-MM-DD'
    count: { type: Number, required: true, default: 0 },     // requests consumed that day
    expires_at: { type: Date, required: true },              // TTL — mongo drops the row itself
});

// The counter key. Unique so the upsert below can never create two rows for the
// same day; a concurrent insert loses with E11000 and is retried as an update.
apiUsageSchema.index({ user_id: 1, date: 1 }, { unique: true });

// Housekeeping: yesterday's counters are dead weight once the window rolls over.
apiUsageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

let ApiUsageModel;
try {
    ApiUsageModel = mongoose.model('ApiUsageModel');
} catch {
    ApiUsageModel = mongoose.model('ApiUsageModel', apiUsageSchema);
}

export { ApiUsageModel };
