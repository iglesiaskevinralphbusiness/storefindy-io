"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, BugReportModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { plans } from '@/utils/constant/pricing';
import { version as pkgVersion } from '../../package.json';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const FREQUENCIES = ['always', 'sometimes', 'rarely'];

const MAX_SCREENSHOTS = 5;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB per file (approx, on the decoded data URL)
const MAX_STEPS = 8;
const APP_VERSION = `v${pkgVersion}`;

function buildReference(seq) {
    // Year is part of the human-readable reference; sequence keeps it unique per report.
    const year = new Date().getFullYear();
    return `BUG-${year}-${String(seq).padStart(3, '0')}`;
}

export async function submitBugReport(_prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const form = {
        subject: sanitizeInput((formData.get('subject') || '').toString().trim()),
        severity: sanitizeInput((formData.get('severity') || '').toString().trim()),
        affected_feature: sanitizeInput((formData.get('affected_feature') || '').toString().trim()),
        frequency: sanitizeInput((formData.get('frequency') || '').toString().trim()),
        description: sanitizeInput((formData.get('description') || '').toString().trim()),
        expected_behavior: sanitizeInput((formData.get('expected_behavior') || '').toString().trim()),
    };

    // Steps — multiple inputs share the name "steps"; drop blanks, trim, cap length & count.
    const steps = formData.getAll('steps')
        .map((s) => sanitizeInput((s || '').toString().trim()))
        .filter(Boolean)
        .slice(0, MAX_STEPS)
        .map((s) => s.slice(0, 200));

    // Screenshots — submitted as a JSON array of base64 data URLs.
    let screenshots = [];
    try {
        const raw = (formData.get('screenshots_json') || '').toString();
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                screenshots = parsed.filter((s) => typeof s === 'string' && s.startsWith('data:image/'));
            }
        }
    } catch {
        screenshots = [];
    }

    // System info — auto-detected client-side, stored for debugging context.
    const system_info = {
        browser: sanitizeInput((formData.get('sys_browser') || '').toString().trim()).slice(0, 120),
        os: sanitizeInput((formData.get('sys_os') || '').toString().trim()).slice(0, 120),
        screen_resolution: sanitizeInput((formData.get('sys_screen') || '').toString().trim()).slice(0, 60),
        user_agent: sanitizeInput((formData.get('sys_ua') || '').toString().trim()).slice(0, 500),
        plan: sanitizeInput((formData.get('sys_plan') || '').toString().trim()).slice(0, 60),
        app_version: APP_VERSION,
    };

    // Validation
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
        // data URLs are ~1.37x the raw bytes after base64 encoding
        errors.screenshots = 'Each screenshot must be 5MB or smaller';
    }

    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    try {
        // Sequence per year for a friendly reference number.
        const year = new Date().getFullYear();
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const seq = (await BugReportModel.countDocuments({ createdAt: { $gte: start } })) + 1;
        const reference = buildReference(seq);

        await BugReportModel.create({
            user_id: session.user.id,
            email: session.user.email || '',
            reference,
            subject: form.subject,
            severity: form.severity || 'medium',
            affected_feature: form.affected_feature,
            frequency: form.frequency || 'always',
            description: form.description,
            expected_behavior: form.expected_behavior,
            steps,
            screenshots,
            system_info,
            status: 'open',
        });

        return {
            status: "success",
            reference,
            message: 'Your bug report has been submitted.',
        };
    } catch (error) {
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function getReportBugContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const user = await UserModel.findById(session.user.id).lean();
    const plan = plans.find((p) => p.id === user?.plan) || plans[0];

    const recent = await BugReportModel
        .find({ user_id: session.user.id })
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
        userId: String(session.user.id),
        email: session.user.email || '',
        planName: plan.name,
        appVersion: APP_VERSION,
        previousReports,
    };
}
