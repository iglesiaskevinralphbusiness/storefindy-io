const LOCATION_TEXT_PATTERNS = [
    /(\d+)\s+(?:stores|locations|branches|offices|showrooms)/i,
    /(?:stores|locations|branches|offices|showrooms)\s*(?:in|:)?\s*(\d+)/i,
    /our\s+locations/i,
    /multiple\s+locations/i,
    /nationwide/i,
];

const ADDRESS_PATTERN = /\d{1,5}\s+[A-Za-z0-9.'\- ]+(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\b[^,\n]{0,80},?\s*[A-Za-z .'-]{2,40},?\s*[A-Z]{2}\b/gi;

const CITY_STATE_PATTERN = /[A-Za-z .'-]{2,40},\s*[A-Z]{2}\b/g;

export function detectLocationsFromPages(pages = []) {
    let estimatedLocationCount = 0;
    const evidence = [];
    let hasMultipleLocations = false;

    for (const page of pages) {
        const text = page.text || '';

        for (const pattern of LOCATION_TEXT_PATTERNS) {
            const match = text.match(pattern);
            if (!match) continue;

            const count = parseInt(match[1] || '', 10);
            if (Number.isFinite(count) && count > 0) {
                estimatedLocationCount = Math.max(estimatedLocationCount, count);
                evidence.push(`Mentioned ${count} locations on ${page.url}`);
            } else {
                evidence.push(`Multi-location language found on ${page.url}`);
            }
        }

        const addresses = text.match(ADDRESS_PATTERN) || [];
        if (addresses.length >= 2) {
            estimatedLocationCount = Math.max(estimatedLocationCount, addresses.length);
            hasMultipleLocations = true;
            evidence.push(`${addresses.length} address-like patterns on ${page.url}`);
        }

        const cities = text.match(CITY_STATE_PATTERN) || [];
        const uniqueCities = new Set(cities.map((value) => value.trim().toLowerCase()));
        if (uniqueCities.size >= 3) {
            estimatedLocationCount = Math.max(estimatedLocationCount, uniqueCities.size);
            hasMultipleLocations = true;
            evidence.push(`${uniqueCities.size} city/state mentions on ${page.url}`);
        }

        const locationLinks = (page.locationLinkCount || 0);
        if (locationLinks >= 3) {
            estimatedLocationCount = Math.max(estimatedLocationCount, locationLinks);
            hasMultipleLocations = true;
            evidence.push(`${locationLinks} location-related links on ${page.url}`);
        }
    }

    if (estimatedLocationCount >= 2) {
        hasMultipleLocations = true;
    }

    if (!estimatedLocationCount && hasMultipleLocations) {
        estimatedLocationCount = 2;
    }

    return {
        estimated_location_count: estimatedLocationCount,
        has_multiple_locations: hasMultipleLocations,
        location_evidence: [...new Set(evidence)].slice(0, 12),
    };
}

export function scoreProspect({
    has_store_locator,
    has_multiple_locations,
    estimated_location_count,
    email,
    emails_found = [],
    existing_locator = '',
}) {
    if (has_store_locator && !existing_locator) {
        return {
            score: 0,
            score_reason: 'Already has a store locator',
            score_breakdown: ['Disqualified: existing store locator detected'],
        };
    }

    let score = 0;
    const breakdown = [];

    if (existing_locator) {
        score += 40;
        breakdown.push(`+40 Uses ${existing_locator} store locator widget`);
    }

    if (has_multiple_locations) {
        score += 35;
        breakdown.push('+35 Multi-location business');
    }

    if (estimated_location_count >= 10) {
        score += 25;
        breakdown.push(`+25 ${estimated_location_count} locations detected`);
    } else if (estimated_location_count >= 3) {
        score += 18;
        breakdown.push(`+18 ${estimated_location_count} locations detected`);
    } else if (estimated_location_count >= 2) {
        score += 12;
        breakdown.push(`+12 ${estimated_location_count} locations detected`);
    }

    if (!has_store_locator && has_multiple_locations) {
        score += 20;
        breakdown.push('+20 Multiple locations without a store locator');
    }

    if (existing_locator && has_store_locator) {
        score += 15;
        breakdown.push('+15 Migration target — competitor locator in use');
    }

    if (email || emails_found.length) {
        score += 10;
        breakdown.push('+10 Public business email found');
    }

    score = Math.min(100, score);

    let score_reason = 'Low Storefindy fit';
    if (existing_locator && score >= 50) {
        score_reason = `Strong migration prospect — uses ${existing_locator}`;
    } else if (score >= 75) {
        score_reason = 'Strong Storefindy fit — multi-location without locator';
    } else if (score >= 50) {
        score_reason = 'Good Storefindy fit';
    } else if (score >= 30) {
        score_reason = 'Possible Storefindy fit';
    }

    return { score, score_reason, score_breakdown: breakdown };
}
