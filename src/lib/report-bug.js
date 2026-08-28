// Shared bug-report logic for the dashboard actions and /api/v1/report-bug.
import { BugReportModel, UserModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { serializeForClient } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';
import { version as pkgVersion } from '../../package.json';
import { isValidObjectId } from 'mongoose';

export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const FREQUENCIES = ['always', 'sometimes', 'rarely'];

export const MAX_SCREENSHOTS = 5;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const MAX_STEPS = 8;
export const APP_VERSION = `v${pkgVersion}`;

function buildReference(seq) {
    const year = new Date().getFullYear();
    return `BUG-${year}-${String(seq).padStart(3, '0')}`;
}

export function mapBugReportItem(bug) {
    const systemInfo = bug.system_info || {};
    return {
        _id: String(bug._id),
        email: bug.email || '',
        reference: bug.reference || '',
        subject: bug.subject || '',
        severity: bug.severity || 'medium',
        affected_feature: bug.affected_feature || '',
        frequency: bug.frequency || '',
        description: bug.description || '',
        expected_behavior: bug.expected_behavior || '',
        steps: bug.steps || [],
        screenshots: bug.screenshots || [],
        system_info: {
            browser: systemInfo.browser || '',
            os: systemInfo.os || '',
            screen_resolution: systemInfo.screen_resolution || '',
            user_agent: systemInfo.user_agent || '',
            plan: systemInfo.plan || '',
            app_version: systemInfo.app_version || '',
        },
        status: bug.status || 'open',
        created_at: bug.createdAt ? new Date(bug.createdAt).toISOString() : '',
        updated_at: bug.updatedAt ? new Date(bug.updatedAt).toISOString() : '',
    };
}

function sanitizeSteps(steps) {
    if (!Array.isArray(steps)) return [];
    return steps
        .map((s) => sanitizeInput(String(s || '').trim()))
        .filter(Boolean)
        .slice(0, MAX_STEPS)
        .map((s) => s.slice(0, 200));
}

function sanitizeScreenshots(screenshots) {
    if (!Array.isArray(screenshots)) return [];
    return screenshots.filter((s) => typeof s === 'string' && s.startsWith('data:image/'));
}

function sanitizeSystemInfo(raw = {}) {
    return {
        browser: sanitizeInput(String(raw.browser || '').trim()).slice(0, 120),
        os: sanitizeInput(String(raw.os || '').trim()).slice(0, 120),
        screen_resolution: sanitizeInput(String(raw.screen_resolution || raw.screen || '').trim()).slice(0, 60),
        user_agent: sanitizeInput(String(raw.user_agent || raw.ua || '').trim()).slice(0, 500),
        plan: sanitizeInput(String(raw.plan || '').trim()).slice(0, 60),
        app_version: sanitizeInput(String(raw.app_version || APP_VERSION).trim()).slice(0, 60) || APP_VERSION,
    };
}

export function validateBugReportPayload(body) {
    const form = {
        subject: sanitizeInput(String(body.subject || '').trim()),
        severity: sanitizeInput(String(body.severity || 'medium').trim()),
        affected_feature: sanitizeInput(String(body.affected_feature || '').trim()),
        frequency: sanitizeInput(String(body.frequency || 'always').trim()),
        description: sanitizeInput(String(body.description || '').trim()),
        expected_behavior: sanitizeInput(String(body.expected_behavior || '').trim()),
    };

    const steps = sanitizeSteps(body.steps);
    const screenshots = sanitizeScreenshots(body.screenshots);
    const system_info = sanitizeSystemInfo(body.system_info || body);

    const errors = {};
    if (!form.subject) {
        errors.subject = 'Bug title is required';
    } else if (form.subject.length > 100) {
        errors.subject = 'Bug title must be 100 characters or fewer';
    }
    if (!form.affected_feature) {
        errors.affected_feature = 'Please select the affected feature';
    }
    if (!form.description) {
        errors.description = 'Description is required';
    } else if (form.description.length > 1000) {
        errors.description = 'Description must be 1000 characters or fewer';
    }
    if (form.expected_behavior.length > 1000) {
        errors.expected_behavior = 'Expected behavior must be 1000 characters or fewer';
    }
    if (form.severity && !SEVERITIES.includes(form.severity)) {
        errors.severity = 'Invalid severity';
    }
    if (form.frequency && !FREQUENCIES.includes(form.frequency)) {
        errors.frequency = 'Invalid frequency';
    }
    if (screenshots.length > MAX_SCREENSHOTS) {
        errors.screenshots = `You can attach up to ${MAX_SCREENSHOTS} screenshots`;
    } else if (screenshots.some((s) => s.length > MAX_SCREENSHOT_BYTES * 1.4)) {
        errors.screenshots = 'Each screenshot must be 5MB or smaller';
    }

    if (Object.keys(errors).length > 0) {
        return { errors };
    }

    return {
        payload: {
            ...form,
            steps,
            screenshots,
            system_info,
        },
    };
}

export async function createBugReport({ user_id, email, payload }) {
    await dbConnect();

    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const seq = (await BugReportModel.countDocuments({ createdAt: { $gte: start } })) + 1;
    const reference = buildReference(seq);

    await BugReportModel.create({
        user_id,
        email: email || '',
        reference,
        subject: payload.subject,
        severity: payload.severity || 'medium',
        affected_feature: payload.affected_feature,
        frequency: payload.frequency || 'always',
        description: payload.description,
        expected_behavior: payload.expected_behavior,
        steps: payload.steps,
        screenshots: payload.screenshots,
        system_info: payload.system_info,
        status: 'open',
    });

    return { reference };
}

export async function queryReportBugContext(user_id) {
    await dbConnect();

    const user = await UserModel.findById(user_id).lean();
    const plan = plans.find((p) => p.id === user?.plan) || plans[0];

    const recent = await BugReportModel
        .find({ user_id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    const previousReports = recent.map((r) => ({
        id: String(r._id),
        reference: r.reference || '',
        subject: r.subject || '',
        affected_feature: r.affected_feature || '',
        status: r.status || 'open',
        created_at: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));

    return {
        userId: String(user_id),
        email: user?.email || '',
        planName: plan.name,
        appVersion: APP_VERSION,
        previousReports,
    };
}

export async function queryUserBugReport(user_id, bugId) {
    if (!isValidObjectId(bugId)) {
        return { error: 'Invalid bug report ID.', status: 400 };
    }

    await dbConnect();

    const bug = await BugReportModel.findOne({
        _id: bugId,
        user_id,
    }).lean();

    if (!bug) {
        return { error: 'Bug report not found.', status: 404 };
    }

    return {
        item: serializeForClient(mapBugReportItem(bug)),
    };
}
