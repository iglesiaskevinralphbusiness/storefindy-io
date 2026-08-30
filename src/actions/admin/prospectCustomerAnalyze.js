"use server";

import { revalidatePath } from 'next/cache';
import { ProspectCustomerModel } from '@/mongo';
import { analyzeWebsite } from '@/lib/prospect-crawler/crawlWebsite';
import { normalizeUrl } from '@/lib/prospect-crawler/normalizeUrl';
import { requireAdmin } from '@/actions/admin/prospectCustomerActions';

const ADMIN_PATH = '/admin/contact-email-finder';

function buildProspectPayload(analysis) {
    return {
        site_url: analysis.site_url,
        domain: analysis.domain,
        company_name: analysis.company_name || '',
        email: analysis.email || '',
        emails_found: analysis.emails_found || [],
        score: analysis.score || 0,
        score_reason: analysis.score_reason || '',
        score_breakdown: analysis.score_breakdown || [],
        estimated_location_count: analysis.estimated_location_count || 0,
        has_multiple_locations: Boolean(analysis.has_multiple_locations),
        has_store_locator: Boolean(analysis.has_store_locator),
        existing_locator: analysis.existing_locator || '',
        store_locator_confidence: analysis.store_locator_confidence || 0,
        store_locator_evidence: analysis.store_locator_evidence || [],
        location_evidence: analysis.location_evidence || [],
        analyzed_at: new Date(),
        status: 'pending',
    };
}

function buildAnalyzeData(analysis) {
    return {
        site_url: analysis.site_url,
        domain: analysis.domain,
        company_name: analysis.company_name || '',
        email: analysis.email || '',
        emails_found: analysis.emails_found || [],
        score: analysis.score || 0,
        score_reason: analysis.score_reason || '',
        estimated_location_count: analysis.estimated_location_count || 0,
        has_multiple_locations: Boolean(analysis.has_multiple_locations),
        has_store_locator: Boolean(analysis.has_store_locator),
        existing_locator: analysis.existing_locator || '',
        store_locator_confidence: analysis.store_locator_confidence || 0,
        store_locator_evidence: analysis.store_locator_evidence || [],
        location_evidence: analysis.location_evidence || [],
        score_breakdown: analysis.score_breakdown || [],
    };
}

function mapExistingProspect(existing) {
    return {
        _id: String(existing._id),
        site_url: existing.site_url || '',
        domain: existing.domain || '',
        company_name: existing.company_name || '',
        email: existing.email || '',
        score: existing.score || 0,
        status: existing.status || 'pending',
        analyzed_at: existing.analyzed_at ? new Date(existing.analyzed_at).toISOString() : '',
    };
}

export async function analyzeProspect(_prevState, formData) {
    await requireAdmin();

    const rawUrl = (formData.get('url') || '').toString().trim();
    if (!rawUrl) {
        return { success: false, error: 'Please enter a website URL.' };
    }

    let normalized;
    try {
        normalized = normalizeUrl(rawUrl);
    } catch (error) {
        return { success: false, error: error.message || 'Please enter a valid website URL.' };
    }

    const existing = await ProspectCustomerModel.findOne({ domain: normalized.domain }).lean();
    if (existing && (existing.status === 'pending' || existing.status === 'done')) {
        return {
            success: true,
            type: 'duplicate',
            reason: existing.status === 'done'
                ? 'This website is already in your done list.'
                : 'This website is already in your pending list.',
            data: mapExistingProspect(existing),
        };
    }

    try {
        const analysis = await analyzeWebsite(normalized.site_url);

        const isTargetLocatorProspect = Boolean(analysis.existing_locator);

        if (analysis.has_store_locator && !isTargetLocatorProspect) {
            return {
                success: true,
                type: 'not-prospect',
                reason: 'Already has a store locator',
                data: {
                    site_url: analysis.site_url,
                    store_locator_confidence: analysis.store_locator_confidence,
                    store_locator_evidence: analysis.store_locator_evidence,
                },
            };
        }

        if (!isTargetLocatorProspect && !analysis.has_multiple_locations && analysis.estimated_location_count < 2) {
            return {
                success: true,
                type: 'not-prospect',
                reason: 'No clear evidence of multiple locations',
                data: buildAnalyzeData(analysis),
            };
        }

        const payload = buildProspectPayload(analysis);

        await ProspectCustomerModel.findOneAndUpdate(
            { domain: analysis.domain },
            { $set: payload },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );

        revalidatePath(ADMIN_PATH);

        return {
            success: true,
            type: 'prospect',
            data: buildAnalyzeData(analysis),
        };
    } catch (error) {
        return {
            success: false,
            error: error?.message || 'Unable to access this website.',
            detail: error?.detail || '',
        };
    }
}
