process.env.DATABASE_URL = process.env.DIAG_DB;
import mongoose from 'mongoose';
await mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection.db;
const locs = db.collection('locationmodels');
const lctrs = db.collection('locatormodels');
const users = db.collection('usermodels');
const PLANS = { free: 20, pro: 500, business: 0 };
for (const L of await lctrs.find({}).toArray()) {
  const total = await locs.countDocuments({ locator_id: String(L._id), published: true });
  const u = await users.findOne({ _id: new mongoose.Types.ObjectId(L.user_id) }) || await users.findOne({ _id: L.user_id });
  const plan = u?.plan;
  const skip = PLANS[plan];
  const userTotal = await locs.countDocuments({ user_id: L.user_id });
  const inactiveCount = plan === 'business' ? 0 : Math.max(0, userTotal - (skip ?? 0));
  console.log(
    `${String(L._id)} name=${JSON.stringify(L.name)} country=${L.default_country} radius=${L.search_radius} maxResults=${L.maximum_results_shown} detect=${L.detect_location}`,
    `\n   published locs=${total}  user=${L.user_id} userFound=${!!u} plan=${JSON.stringify(plan)} planKnown=${skip!==undefined} userTotalLocs=${userTotal} INACTIVE=${inactiveCount}`
  );
}
await mongoose.disconnect();
