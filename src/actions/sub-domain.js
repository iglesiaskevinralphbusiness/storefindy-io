"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { LocatorModel, SubDomainModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';
import { plans } from '@/utils/constant/pricing';

export async function getSubDomainInactiveIds(){

    return [];
}

export async function getSubDomains() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const subDomains = await SubDomainModel.aggregate([
        {
            $match: {
                user_id: session.user.id,
            },
        }
    ]);
    // const inactiveIds = await getInactiveIds(session.user.id);

    // const updatedLocators = locators.map(locator => ({
    //     ...locator,
    //     status: inactiveIds.includes(String(locator._id)) ? "inactive" : "active"
    // }));


    return serializeForClient(subDomains);
}
