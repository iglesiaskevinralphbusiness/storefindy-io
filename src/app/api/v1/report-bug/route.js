import { NextResponse } from 'next/server';
import {
    authenticateApiKey,
    jsonValidationError,
    withServerError,
} from '@/lib/api-auth';
import { readJsonBody } from '@/lib/api-payloads';
import {
    createBugReport,
    queryReportBugContext,
    queryUserBugReport,
    validateBugReportPayload,
} from '@/lib/report-bug';

// REST equivalent of the dashboard report-bug actions — src/actions/report-bug.js
//
//   GET  /api/v1/report-bug              — account context + recent reports
//   GET  /api/v1/report-bug?id=<bug_id>  — one report owned by the caller
//   POST /api/v1/report-bug              — submit a new bug report
//   Authorization: Bearer sf_live_...
//
// DELIBERATELY UNDOCUMENTED. Not listed on /dashboard/api-access — exists for
// the WordPress plugin's Report a Bug screen, mirroring analytics/route.js.

export async function GET(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const bugId = searchParams.get('id');

    return withServerError(async () => {
        if (bugId) {
            const result = await queryUserBugReport(auth.user_id, bugId);
            if (result.error) {
                return NextResponse.json(
                    { status: 'error', message: result.error },
                    { status: result.status || 400 }
                );
            }
            return NextResponse.json({ status: 'success', item: result.item }, { status: 200 });
        }

        const context = await queryReportBugContext(auth.user_id);
        return NextResponse.json({ status: 'success', data: context }, { status: 200 });
    }, auth);
}

export async function POST(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { body, errors: bodyErrors } = await readJsonBody(request);
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { payload, errors } = validateBugReportPayload(body);
    if (errors) return jsonValidationError(errors);

    return withServerError(async () => {
        const { reference } = await createBugReport({
            user_id: auth.user_id,
            email: auth.user?.email || '',
            payload,
        });

        return NextResponse.json(
            {
                status: 'success',
                reference,
                message: 'Your bug report has been submitted.',
            },
            { status: 201 }
        );
    }, auth);
}
