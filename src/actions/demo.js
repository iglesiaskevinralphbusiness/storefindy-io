"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';

export async function getLocatorByIdDemoPage(locator_id) {
    // check if location_id is a valid ObjectId
    if (!isValidObjectId(locator_id)) {
        return null;
    }

    await dbConnect();

    const locator = await LocatorModel.findOne({ _id: locator_id }).lean();
    if (!locator) {
        return null;
    }

    return serializeForClient({
        ...locator,
        user_plan: 'business',
        status: 'active',
    });
}

export async function getAvailableCountriesBasedOnLocationsDemoPage(locator_id) {
    // check if location_id is a valid ObjectId
    if (!isValidObjectId(locator_id)) {
        return null;
    }

    await dbConnect();

    const countries = await LocationModel.distinct('country', { locator_id })
    return serializeForClient(countries);
}