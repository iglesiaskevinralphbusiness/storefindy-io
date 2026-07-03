import { NextResponse } from 'next/server';
import mongoose, { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel } from '@/mongo/LocationsModel';
import { LocatorModel } from '@/mongo/LocatorModel';
import { UserModel } from '@/mongo/UserModel';
import { serializeForClient, getCurrentHourCode } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
    return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function POST(request) {
    const { searchParams } = new URL(request.url);

    // analytics parameters
    const isDemo = searchParams.get('is_demo') === 'true' || searchParams.get('is_demo') === true ? true : false; // for demo purposes we will not use the analytics
    const isRecordQuery = isDemo ? false : searchParams.get('is_record_query') === 'true' || searchParams.get('is_record_query') === true ? true : false;

    const locationId = searchParams.get('location_id') || '';

    if (!locationId || !isValidObjectId(locationId)) {
        return json({ status: 'error', message: 'A valid location is required.' }, 400);
    }

    await dbConnect();

    const today = new Date().toISOString().split("T")[0];
    
    if(isRecordQuery){
        const locationIds = [new mongoose.Types.ObjectId(locationId)];

        // step 1. Increment existing click_count
        await LocationModel.updateMany(
            {
                _id: { $in: locationIds },
                "views.date_id": today,
            },
            {
                $inc: {
                    "views.$.click_count": 1,
                },
            }
        );

        // step 2: Add today's record if it doesn't exist
        await LocationModel.updateMany(
            {
                _id: { $in: locationIds },
                views: {
                    $not: {
                        $elemMatch: {
                            date_id: today,
                        },
                    },
                },
            },
            {
                $push: {
                    views: {
                        date_id: today,
                        view_count: 0,
                        click_count: 1,
                    },
                },
            }
        );
    }

    return json({
        status: 'success',
    });

}