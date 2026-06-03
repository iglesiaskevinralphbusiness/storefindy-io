"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel } from '@/mongo/LocationsModel';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { serializeForClient } from '@/utils/helpers';

export async function postCreateLocation(categories, hours, holidays, _prev, formData) {
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
        categories,
        description: formData.get('description').trim(),
        latitude: formData.get('latitude'),
        street: formData.get('street').trim(),
        city: formData.get('city').trim(),
        state: formData.get('state').trim(),
        postal: formData.get('postal').trim(),
        country: formData.get('country'),
        longitude: formData.get('longitude'),
        contact: {
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim(),
            website: formData.get('website').trim()
        },
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
        email: form.contact.email,
        website: form.contact.website,
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

export async function getLocations(page=1, rows=10) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // pagination
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const currentRows = Number(rows) > 0 ? Number(rows) : 10;

    const totalCount = await LocationModel.countDocuments({ user_id: session.user.id });
    const totalPages = Math.ceil(totalCount / currentRows);
    
    const locations = await LocationModel.aggregate([
        { $match: { user_id: session.user.id } },
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
        {
            $project: {
                _id: 1,
                name: 1,
                street: 1,
                city: 1,
                state: 1,
                postal: 1,
                country: 1,
                published: 1,
                views: 1,
                locator: 1,
            }
        },
        { $sort: { created_at: -1 } },
        { $skip: (currentPage - 1) * currentRows },
        { $limit: currentRows }
    ]);

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(locations)
    }
}