"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel, LocatorModel, UserModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';
import { plans } from '@/utils/constant/pricing';

// CSV imports don't collect business hours, so every imported location starts
// with this default schedule (the model requires all seven days).
const DEFAULT_IMPORT_HOURS = {
    Mon: { enabled: true, open: '08:00', close: '17:00' },
    Tue: { enabled: true, open: '08:00', close: '17:00' },
    Wed: { enabled: true, open: '08:00', close: '17:00' },
    Thu: { enabled: true, open: '08:00', close: '17:00' },
    Fri: { enabled: true, open: '08:00', close: '17:00' },
    Sat: { enabled: true, open: '08:00', close: '17:00' },
    Sun: { enabled: false, open: '08:00', close: '17:00' },
};

export async function postCreateLocation(categories, hours, holidays, socialMediaLinks, _prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // Sanitize all user-supplied fields against NoSQL injection ($-prefixed keys).
    const form = sanitizeInput({
        user_id: session.user.id,
        name: formData.get('store_name').trim(),
        locator_id: formData.get('locator_id'),
        filters: categories,
        description: formData.get('description').trim(),
        latitude: formData.get('latitude'),
        street: formData.get('street').trim(),
        city: formData.get('city').trim(),
        state: formData.get('state').trim(),
        postal: formData.get('postal').trim(),
        country: formData.get('country'),
        longitude: formData.get('longitude'),
        phone: formData.get('phone').trim(),
        email: formData.get('email').trim(),
        website: formData.get('website').trim(),
        view_location_url: (formData.get('location_website_url') || '').trim(),
        social_media_links: Array.isArray(socialMediaLinks)
            ? socialMediaLinks
                .map((item) => ({ code: String(item?.code ?? '').trim(), link: String(item?.link ?? '').trim() }))
                .filter((item) => item.code && item.link)
            : [],
        location_status: formData.get('location_status'),
        hours,
        holidays,
        published: formData.get('published') === 'on' ? true : false,
        show_opening_hours: formData.get('opening_hours') === 'on' ? true : false,
        custom_notes: formData.get('custom_notes').trim(),
    });

    // validation
    const errors = {};

    // Coordinate field: required, coerced to number, within range.
    const coordinate = (min, max, label) =>
        z.preprocess(
            (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
            z.coerce
                .number({ message: `${label} must be a number between ${min} and ${max}` })
                .min(min, `${label} must be between ${min} and ${max}`)
                .max(max, `${label} must be between ${min} and ${max}`)
        );

    // Optional string: empty is allowed, but if present it must match the format.
    const optionalFormat = (format, message) =>
        z.string().trim().refine((v) => v === '' || format.safeParse(v).success, { message });

    const locationSchema = z.object({
        store_name: z.string().trim().min(1, 'Store name is required'),
        locator_id: z.string().trim().min(1, 'Locator is required'),
        city: z.string().trim().min(1, 'City is required'),
        state: z.string().trim().min(1, 'State is required'),
        country: z.string().trim().min(1, 'Country is required'),
        location_status: z.string().trim().min(1, 'Location status is required'),
        latitude: coordinate(-90, 90, 'Latitude'),
        longitude: coordinate(-180, 180, 'Longitude'),
        email: optionalFormat(z.email(), 'Email is not a valid format'),
        website: optionalFormat(z.url(), 'Website must be a valid URL (including http:// or https://)'),
        location_website_url: optionalFormat(z.url(), 'View location URL must be a valid URL (including http:// or https://)'),
    });

    const parsed = locationSchema.safeParse({
        store_name: form.name,
        locator_id: form.locator_id,
        city: form.city,
        state: form.state,
        country: form.country,
        location_status: form.location_status,
        latitude: form.latitude,
        longitude: form.longitude,
        email: form.email,
        website: form.website,
        location_website_url: form.view_location_url,
    });

    if (!parsed.success) {
        for (const issue of parsed.error.issues) {
            const key = issue.path[0];
            if (key && !errors[key]) errors[key] = issue.message;
        }
    }

    // Hours: every day must be present with valid open/close when enabled
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const day of days) {
        const d = hours?.[day];
        if (!d || typeof d.enabled !== 'boolean') {
            errors.hours = 'Business hours are required for every day';
            break;
        }
        if (d.enabled && (!d.open || !d.close)) {
            errors.hours = 'Open and close times are required for enabled days';
            break;
        }
    }

    // if any errors, return early
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    // Use the coerced number values from zod to match schema types
    form.latitude = parsed.data.latitude;
    form.longitude = parsed.data.longitude;

    // save
    try {
        await LocationModel.create(form);
        return { status: "success", message: 'Location added successfully' };
    } catch (error) {
        console.log(error)
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function postEditLocation(location_id, categories, hours, holidays, socialMediaLinks, _prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // Sanitize all user-supplied fields against NoSQL injection ($-prefixed keys).
    const form = sanitizeInput({
        user_id: session.user.id,
        name: formData.get('store_name').trim(),
        locator_id: formData.get('locator_id'),
        filters: categories,
        description: formData.get('description').trim(),
        latitude: formData.get('latitude'),
        street: formData.get('street').trim(),
        city: formData.get('city').trim(),
        state: formData.get('state').trim(),
        postal: formData.get('postal').trim(),
        country: formData.get('country'),
        longitude: formData.get('longitude'),
        phone: formData.get('phone').trim(),
        email: formData.get('email').trim(),
        website: formData.get('website').trim(),
        view_location_url: (formData.get('location_website_url') || '').trim(),
        social_media_links: Array.isArray(socialMediaLinks)
            ? socialMediaLinks
                .map((item) => ({ code: String(item?.code ?? '').trim(), link: String(item?.link ?? '').trim() }))
                .filter((item) => item.code && item.link)
            : [],
        location_status: formData.get('location_status'),
        hours,
        holidays,
        published: formData.get('published') === 'on' ? true : false,
        show_opening_hours: formData.get('opening_hours') === 'on' ? true : false,
        custom_notes: formData.get('custom_notes').trim(),
    });

    // validation
    const errors = {};

    // Coordinate field: required, coerced to number, within range.
    const coordinate = (min, max, label) =>
        z.preprocess(
            (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
            z.coerce
                .number({ message: `${label} must be a number between ${min} and ${max}` })
                .min(min, `${label} must be between ${min} and ${max}`)
                .max(max, `${label} must be between ${min} and ${max}`)
        );

    // Optional string: empty is allowed, but if present it must match the format.
    const optionalFormat = (format, message) =>
        z.string().trim().refine((v) => v === '' || format.safeParse(v).success, { message });

    const locationSchema = z.object({
        store_name: z.string().trim().min(1, 'Store name is required'),
        locator_id: z.string().trim().min(1, 'Locator is required'),
        city: z.string().trim().min(1, 'City is required'),
        state: z.string().trim().min(1, 'State is required'),
        country: z.string().trim().min(1, 'Country is required'),
        location_status: z.string().trim().min(1, 'Location status is required'),
        latitude: coordinate(-90, 90, 'Latitude'),
        longitude: coordinate(-180, 180, 'Longitude'),
        email: optionalFormat(z.email(), 'Email is not a valid format'),
        website: optionalFormat(z.url(), 'Website must be a valid URL (including http:// or https://)'),
        location_website_url: optionalFormat(z.url(), 'View location URL must be a valid URL (including http:// or https://)'),
    });

    const parsed = locationSchema.safeParse({
        store_name: form.name,
        locator_id: form.locator_id,
        city: form.city,
        state: form.state,
        country: form.country,
        location_status: form.location_status,
        latitude: form.latitude,
        longitude: form.longitude,
        email: form.email,
        website: form.website,
        location_website_url: form.view_location_url,
    });

    if (!parsed.success) {
        for (const issue of parsed.error.issues) {
            const key = issue.path[0];
            if (key && !errors[key]) errors[key] = issue.message;
        }
    }

    // Hours: every day must be present with valid open/close when enabled
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const day of days) {
        const d = hours?.[day];
        if (!d || typeof d.enabled !== 'boolean') {
            errors.hours = 'Business hours are required for every day';
            break;
        }
        if (d.enabled && (!d.open || !d.close)) {
            errors.hours = 'Open and close times are required for enabled days';
            break;
        }
    }

    // if any errors, return early
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    // Use the coerced number values from zod to match schema types
    form.latitude = parsed.data.latitude;
    form.longitude = parsed.data.longitude;

    // save
    try {
        await LocationModel.findByIdAndUpdate(location_id, form, { new: true });
        return { status: "success", message: 'Location updated successfully' };
    } catch (error) {
        console.log(error)
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function getLocationsInactiveIds(user_id){
    await dbConnect();
    
    const user = await UserModel.findOne({ _id: user_id }).lean();
    if(!user) {
        return [];
    }

    const plan = plans.find(p => p.id === user.plan) || plan[0];
    const skip = plan.max_location;

    if(plan.id === 'business') {
        return [];
    }

    const locations = (await LocationModel.find({ user_id })
        .sort({ createdAt: 1 }) // oldest -> newest
        .skip(skip)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());

    return locations;

}

export async function getLocations(page=1, rows=10, sort='createdAt', order='asc', search='', locators='') {

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    // build the query
    const match = {
        user_id: session.user.id
    };
    if (search) {
        match.$or = [
            { name: { $regex: search, $options: "i" } },
            { street: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
            { state: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } },
            { postal: { $regex: search, $options: "i" } }
        ];
    }
    if (locators) {
        match.locator_id = {
            $in: locators.split(",")
        };
    }

    await dbConnect();

    // pagination
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const currentRows = Number(rows) > 0 ? Number(rows) : 10;

    const totalCount = await LocationModel.countDocuments({ user_id: session.user.id });
    const totalPages = Math.ceil(totalCount / currentRows);

    // sort
    const sortField = sort || 'updatedAt';
    const sortOrder = order === 'desc' ? 1 : -1;
    
    const locations = serializeForClient(await LocationModel.aggregate([
        { $match: match },

        // add locator name
        { $addFields: { locatorId: { "$toObjectId": "$locator_id" } } },
        {
            $lookup: {
                from: "locatormodels",
                localField: "locatorId",
                foreignField: "_id",
                as: "locator"
            }
        },
        {
            $addFields: {
                locator: {
                    $arrayElemAt: ["$locator.name", 0]
                }
            }
        },

        // concatenate address
        {
            $addFields: {
                address: {
                    $reduce: {
                        input: {
                            $filter: {
                                input: ["$street", "$city", "$state", "$country", "$postal"],
                                as: "part",
                                cond: {
                                    $and: [
                                        { $ne: ["$$part", null] },
                                        { $ne: ["$$part", ""] }
                                    ]
                                }
                            }
                        },
                        initialValue: "",
                        in: {
                            $cond: {
                                if: { $eq: ["$$value", ""] },
                                then: "$$this",
                                else: { $concat: ["$$value", ", ", "$$this"] }
                            }
                        }
                    }
                }
            }
        },

        {
            $project: {
                locator_id: 1,
                _id: 1,
                name: 1,
                address: 1,
                published: 1,
                views: 1,
                updatedAt: 1,
                createdAt: 1,
                locator: 1,
            }
        },
        { $sort: { [sortField]: sortOrder } },
        { $skip: (currentPage - 1) * currentRows },
        { $limit: currentRows }
    ]));
    


    // inactive ids - set inactive locations that are beyond the plan's limit
    const inactiveIds = await getLocationsInactiveIds(session.user.id);
    const locationsWithStatus = locations.map(location => ({
        ...location,
        status: inactiveIds.includes(String(location._id)) ? "inactive" : "active"
    }));

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(locationsWithStatus)
    }
}

export async function getLocationById(location_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    // check if location_id is a valid ObjectId
    if (!isValidObjectId(location_id)) {
        return null;
    }

    await dbConnect();
    const location = await LocationModel.findOne({ _id: location_id, user_id: session.user.id }).lean();
    return serializeForClient(location);
}

// Bulk-import locations from a parsed CSV into a single locator.
// `records` is the client-mapped rows: { name, city, state, country, lat, lng, phone?, email?, website? }.
// `mode` controls how the rows are applied to the locator's existing locations:
//   - 'append'  : insert every valid row (nothing is removed)
//   - 'replace' : delete all existing locations in the locator, then insert the valid rows
//   - 'update'  : upsert by name within the locator (existing names are updated, new names inserted)
export async function importCSV(locatorId, mode, records) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // Validate the request shape before touching the database.
    if (!locatorId || typeof locatorId !== 'string') {
        return { status: "error", message: "Please select a locator." };
    }
    if (!['append', 'replace', 'update'].includes(mode)) {
        return { status: "error", message: "Invalid import mode." };
    }
    if (!Array.isArray(records) || records.length === 0) {
        return { status: "error", message: "No rows to import." };
    }

    // The locator must exist and belong to the signed-in user.
    const locator = await LocatorModel.findOne({ _id: locatorId, user_id: session.user.id }).lean();
    if (!locator) {
        return { status: "error", message: "Locator not found." };
    }

    // Required coordinate: coerced to number and range-checked.
    const coordinate = (min, max) =>
        z.preprocess(
            (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
            z.coerce.number().min(min).max(max)
        );

    const rowSchema = z.object({
        name: z.string().trim().min(1),
        city: z.string().trim().min(1),
        state: z.string().trim().min(1),
        country: z.string().trim().min(1),
        latitude: coordinate(-90, 90),
        longitude: coordinate(-180, 180),
    });

    // Re-validate every row server-side; build full location docs for the valid ones.
    const docs = [];
    let skipped = 0;
    for (const raw of records) {
        // Sanitize against NoSQL injection ($-prefixed keys) before validating.
        const clean = sanitizeInput({
            name: String(raw?.name ?? '').trim(),
            city: String(raw?.city ?? '').trim(),
            state: String(raw?.state ?? '').trim(),
            country: String(raw?.country ?? '').trim(),
            lat: String(raw?.lat ?? '').trim(),
            lng: String(raw?.lng ?? '').trim(),
            phone: String(raw?.phone ?? '').trim(),
            email: String(raw?.email ?? '').trim(),
            website: String(raw?.website ?? '').trim(),
            view_location_url: String(raw?.view_location_url ?? '').trim(),
        });

        const parsed = rowSchema.safeParse({
            name: clean.name,
            city: clean.city,
            state: clean.state,
            country: clean.country,
            latitude: clean.lat,
            longitude: clean.lng,
        });

        if (!parsed.success) {
            skipped++;
            continue;
        }

        docs.push({
            user_id: session.user.id,
            locator_id: locatorId,
            name: clean.name,
            description: '',
            street: '',
            city: clean.city,
            state: clean.state,
            postal: '',
            country: clean.country,
            latitude: parsed.data.latitude,
            longitude: parsed.data.longitude,
            location_status: 'open',
            hours: DEFAULT_IMPORT_HOURS,
            holidays: [],
            phone: clean.phone,
            email: clean.email,
            website: clean.website,
            view_location_url: clean.view_location_url,
            published: true,
            show_opening_hours: false,
            custom_notes: '',
        });
    }

    if (docs.length === 0) {
        return { status: "error", message: "No valid rows to import. Check that required fields are filled and coordinates are valid numbers." };
    }

    try {
        let imported = 0;
        let updated = 0;

        if (mode === 'replace') {
            // Wipe the locator's existing locations, then insert the new set.
            await LocationModel.deleteMany({ user_id: session.user.id, locator_id: locatorId });
            await LocationModel.insertMany(docs);
            imported = docs.length;
        } else if (mode === 'update') {
            // Upsert by name within this locator: matching names are updated, new names inserted.
            for (const doc of docs) {
                const res = await LocationModel.updateOne(
                    { user_id: session.user.id, locator_id: locatorId, name: doc.name },
                    { $set: doc },
                    { upsert: true }
                );
                if (res.upsertedCount > 0) imported++;
                else updated++;
            }
        } else {
            // append
            await LocationModel.insertMany(docs);
            imported = docs.length;
        }

        return {
            status: "success",
            message: "Import completed successfully.",
            imported,
            updated,
            skipped,
            total: records.length,
        };
    } catch (error) {
        console.log(error);
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function postDeleteLocation(location_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // check if location_id is a valid ObjectId
    if (!isValidObjectId(location_id)) {
        return { status: "error", message: 'Invalid selected location' };
    }
    
    await LocationModel.findByIdAndDelete(location_id);
    return { status: "success", message: 'Location deleted successfully' };
}

export async function postBulkDeleteLocations(location_ids) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (!Array.isArray(location_ids) || location_ids.length === 0) {
        return { status: "error", message: 'No locations selected' };
    }

    // check if all location_ids are valid ObjectIds
    for (const location_id of location_ids) {
        if (!isValidObjectId(location_id)) {
            return { status: "error", message: 'Invalid selected location' };
        }
    }

    await dbConnect();

    const res = await LocationModel.deleteMany({ _id: { $in: location_ids } });
    return {
        status: "success",
        message: `${res.deletedCount} location${res.deletedCount === 1 ? '' : 's'} deleted successfully`,
        deletedCount: res.deletedCount,
    };
}

export async function postPublishLocation(location_id, action) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // check if location_id is a valid ObjectId
    if (!isValidObjectId(location_id)) {
        return { status: "error", message: 'Invalid selected location' };
    }

    await LocationModel.findByIdAndUpdate(location_id, { published: action === 'publish' ? true : false });
    return { status: "success", message: 'Location published successfully' };
}

export async function postBulkPublishLocations(location_ids, action) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (!Array.isArray(location_ids) || location_ids.length === 0) {
        return { status: "error", message: 'No locations selected' };
    }

    // check if all location_ids are valid ObjectIds
    for (const location_id of location_ids) {
        if (!isValidObjectId(location_id)) {
            return { status: "error", message: 'Invalid selected location' };
        }
    }

    await dbConnect();

    // count how many locations are being updated by action, skip the ones that are already in the desired state
    const count = await LocationModel.countDocuments({ _id: { $in: location_ids }, published: action === 'publish' ? false : true });
    if (count === 0) {
        return { status: "error", message: `The selected locations are already in the ${action} status` };
    }

    const res = await LocationModel.updateMany({ _id: { $in: location_ids } }, { published: action === 'publish' ? true : false });
    return {
        status: "success",
        message: `${count} location${count === 1 ? '' : 's'} published successfully`,
        modifiedCount: res.modifiedCount,
    };
}