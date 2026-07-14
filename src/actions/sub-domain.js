"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, SubDomainModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';
import { plans } from '@/utils/constant/pricing';

// subdomain name validation schema
// Only lowercase letters, numbers, and hyphens. 3–30 characters.
const subDomainNameSchema = z
    .string()
    .trim()
    .min(3, 'Must be at least 3 characters')
    .max(30, 'Must be at most 30 characters')
    .regex(
        /^[a-z0-9-]+$/,
        'Only lowercase letters, numbers, and hyphens are allowed'
    );

// Void (self-closing) HTML elements that never need a closing tag
const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Lightweight structural HTML validation for header/footer snippets.
 * Runs server-side (no DOM), so it checks that the markup is well-formed —
 * tags are recognizable and properly balanced/nested — rather than validating
 * against the full HTML spec.
 *
 * @param {string} html
 * @returns {boolean} true when the markup is well-formed
 */
function isValidHTML(html) {
    if (typeof html !== 'string') return false;
    if (html.trim() === '') return true; // empty is treated as valid (optional field)

    // strip comments, CDATA, doctype and other declarations so they don't
    // interfere with tag matching
    const cleaned = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
        .replace(/<![^>]*>/g, '');

    const tagRegex = /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)[^>]*?(\/)?\s*>/g;
    const stack = [];
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(cleaned)) !== null) {
        // a stray '<' in the text before this tag means malformed markup
        // (e.g. an unclosed "<div" that never reached a '>')
        if (cleaned.slice(lastIndex, match.index).includes('<')) return false;
        lastIndex = tagRegex.lastIndex;

        const isClosing = Boolean(match[1]);
        const tagName = match[2].toLowerCase();
        const selfClosed = Boolean(match[3]);

        if (isClosing) {
            // a closing tag must match the most recently opened tag
            if (stack.pop() !== tagName) return false;
        } else if (!selfClosed && !VOID_ELEMENTS.has(tagName)) {
            stack.push(tagName);
        }
    }

    // any trailing '<' after the last tag is also malformed
    if (cleaned.slice(lastIndex).includes('<')) return false;

    // every opened tag must have been closed
    return stack.length === 0;
}

/**
 * Lightweight structural CSS validation for the custom CSS field.
 * No CSS parser is available server-side, so it verifies the markup is
 * well-formed — braces balanced, every rule has a selector, and every
 * declaration is a "property: value" pair — rather than validating each
 * property against the CSS spec.
 *
 * @param {string} css
 * @returns {boolean} true when the CSS is well-formed
 */
function isValidCSS(css) {
    if (typeof css !== 'string') return false;
    if (css.trim() === '') return true; // empty is treated as valid (optional field)

    // strip comments so they don't interfere with the checks below
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');

    // braces must be balanced and never close before they open
    let depth = 0;
    for (const ch of cleaned) {
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth < 0) return false;
        }
    }
    if (depth !== 0) return false;

    // must contain at least one rule block
    if (!cleaned.includes('{')) return false;

    // validate each leaf "selector { declarations }" block
    const ruleRegex = /([^{}]*)\{([^{}]*)\}/g;
    let match;
    while ((match = ruleRegex.exec(cleaned)) !== null) {
        const selector = match[1].trim();
        const body = match[2];

        if (selector === '') return false; // a rule must have a selector

        for (const decl of body.split(';')) {
            const trimmed = decl.trim();
            if (trimmed === '') continue; // allow trailing/empty declarations
            if (!trimmed.includes(':')) return false; // must be "property: value"
        }
    }

    return true;
}

/**
 * Validates the custom JS field by compiling it with the Function
 * constructor, which parses the source and throws on a syntax error
 * WITHOUT executing any of the code.
 *
 * @param {string} js
 * @returns {boolean} true when the JS is syntactically valid
 */
function isValidJS(js) {
    if (typeof js !== 'string') return false;
    if (js.trim() === '') return true; // empty is treated as valid (optional field)

    try {
        // eslint-disable-next-line no-new-func
        new Function(js); // parses only — the code is never run
        return true;
    } catch {
        return false;
    }
}

/**
 * Reads the format and pixel dimensions of a favicon image straight from its
 * binary header — no image library needed. Supports PNG and ICO.
 *
 * @param {Buffer} buffer
 * @returns {{ format: 'png' | 'ico', width: number, height: number } | null}
 */
function getImageInfo(buffer) {
    // PNG: 8-byte signature followed by the IHDR chunk holding the dimensions
    const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buffer.length >= 24 && PNG_SIGNATURE.every((b, i) => buffer[i] === b)) {
        return {
            format: 'png',
            width: buffer.readUInt32BE(16),  // width lives at byte 16 (big-endian)
            height: buffer.readUInt32BE(20), // height lives at byte 20 (big-endian)
        };
    }

    // ICO: header is reserved(2)=0, type(2)=1, count(2); then 16-byte entries.
    // The dimensions are the largest entry (0 means 256).
    if (buffer.length >= 6 && buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0) {
        const count = buffer.readUInt16LE(4);
        let width = 0;
        let height = 0;
        for (let i = 0; i < count; i++) {
            const offset = 6 + i * 16;
            if (offset + 1 >= buffer.length) break;
            const w = buffer[offset] === 0 ? 256 : buffer[offset];
            const h = buffer[offset + 1] === 0 ? 256 : buffer[offset + 1];
            if (w > width) width = w;
            if (h > height) height = h;
        }
        return { format: 'ico', width, height };
    }

    return null;
}

/**
 * Validates an uploaded favicon and, when valid, converts it to a base64
 * data-URL ready to persist on the SubDomain model.
 *
 * Rules: must be a .png or .ico image and be between 16x16 and 64x64 pixels.
 *
 * @param {File} file
 * @returns {Promise<{ error: string } | { dataUrl: string }>}
 */
async function processFavicon(file) {
    // first check: the file must be a PNG or ICO
    const name = (file.name || '').toLowerCase();
    const isPng = name.endsWith('.png');
    const isIco = name.endsWith('.ico');
    if (!isPng && !isIco) {
        return { error: 'Favicon must be a .png or .ico file' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const info = getImageInfo(buffer);
    if (!info) {
        return { error: 'Favicon must be a valid .png or .ico file' };
    }

    // second check: the image must meet the size requirements (16x16 – 64x64)
    if (info.width < 16 || info.height < 16) {
        return { error: 'Favicon must be at least 16x16 pixels' };
    }
    if (info.width > 64 || info.height > 64) {
        return { error: 'Favicon must be at most 64x64 pixels' };
    }

    // convert to a data-URL for storage
    const mime = info.format === 'png' ? 'image/png' : 'image/x-icon';
    return { dataUrl: `data:${mime};base64,${buffer.toString('base64')}` };
}

export async function getSubDomainInactiveIds(user_id){
    await dbConnect();

    const user = await UserModel.findOne({ _id: user_id }).lean();
    if (!user) {
        return [];
    }

    const plan = plans.find(p => p.id === user.plan) || plan[0];
    const skip = plan.max_sub_domain;

    const subDomains = (await SubDomainModel.find({ user_id })
        .sort({ createdAt: 1 }) // oldest -> newest
        .skip(skip)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());

    return subDomains;
}

export async function getSubDomains(page=1, rows=10, sort='createdAt', order='asc') {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // pagination
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const currentRows = Number(rows) > 0 ? Number(rows) : 10;

    const totalCount = await SubDomainModel.countDocuments({ user_id: session.user.id });
    const totalPages = Math.ceil(totalCount / currentRows);

    // sort
    const sortField = sort || 'updatedAt';
    const sortOrder = order === 'desc' ? 1 : -1;

    const subDomains = await SubDomainModel.aggregate([
        {
            $match: {
                user_id: session.user.id,
            },
        },

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

        {
            $project: {
                locator_id: 1,
                locator: 1,
                _id: 1,
                name: 1,
                visits: 1,
                updatedAt: 1,
                createdAt: 1,
                favicon: 1,
            }
        },
        { $sort: { [sortField]: sortOrder } },
        { $skip: (currentPage - 1) * currentRows },
        { $limit: currentRows }
    ]);

    // inactive ids - set inactive locations that are beyond the plan's limit
    const inactiveIds = await getSubDomainInactiveIds(session.user.id);
    const subDomainsWithStatus = subDomains.map(subDomain => ({
        ...subDomain,
        status: inactiveIds.includes(String(subDomain._id)) ? "inactive" : "active"
    }));

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(subDomainsWithStatus)
    }
}

export async function postCheckSubDomainAvailability(name) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // validate subdomain name format
    const result = subDomainNameSchema.safeParse(name);
    if (!result.success) {
        return {
            status: "error",
            errors: { name: result.error.issues[0].message },
        };
    }

    
    const nameClean = result.data;

    // check if subdomain is already taken
    const subDomain = await SubDomainModel.findOne({ name: nameClean });
    if (subDomain) {
        return {
            status: "error",
            errors: { name: `Your subdomain named "${nameClean}" is already taken.` },
        };
    }

    return {
        status: "success",
        data: `Your subdomain named "${result.data}" is available.`,
    };
}

export async function getSubDomainById(subdomain_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const subDomain = await SubDomainModel.findById(subdomain_id);
    return serializeForClient(subDomain);
}

export async function postCreateDomain(_prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const form = {
        user_id: session.user.id,
        name: formData.get('name').trim(),
        locator_id: formData.get('locator_id'),
        meta_title: formData.get('meta_title'),
        meta_description: formData.get('meta_description'),
        custom_html_header: formData.get('header'),
        custom_html_footer: formData.get('footer'),
        custom_css: formData.get('custom_css'),
        custom_js: formData.get('custom_js'),
    }
   
    // validate subdomain name format
    const result = subDomainNameSchema.safeParse(form.name);
    if (!result.success) {
        return {
            status: "error",
            errors: { name: result.error.issues[0].message },
        };
    }

    // result.data holds the validated + trimmed subdomain name for the availability lookup
    const nameClean = result.data;

    // check if subdomain is already taken
    const subDomain = await SubDomainModel.findOne({ name: nameClean });
    if (subDomain) {
        return {
            status: "error",
            errors: { name: `Your subdomain named "${nameClean}" is already taken.` },
        };
    }


    // validate if locator_id is a valid object id and exists in the database
    if(!isValidObjectId(form.locator_id)) {
        return { status: "error", errors: { locator_id: 'Invalid locator id' } };
    }
    const locator = await LocatorModel.findById(form.locator_id);
    if(!locator) {
        return { status: "error", errors: { locator_id: 'Locator not found' } };
    }


    // validate if header and footer are valid HTML
    let errors = {};
    if (form.header && !isValidHTML(form.header)) {
        errors.header = 'Header is not valid HTML';
    }
    if (form.footer && !isValidHTML(form.footer)) {
        errors.footer = 'Footer is not valid HTML';
    }

    if(form.custom_css && !isValidCSS(form.custom_css)) {
        errors.custom_css = 'Custom CSS is not valid CSS';
    }
    if(form.custom_js && !isValidJS(form.custom_js)) {
        errors.custom_js = 'Custom JS is not valid JS';
    }

    // validate + convert the favicon (only when a file was actually uploaded)
    const favicon = formData.get('favicon');
    if (favicon && typeof favicon.arrayBuffer === 'function' && favicon.size > 0) {
        const result = await processFavicon(favicon);
        if (result.error) {
            errors.favicon = result.error;
        } else {
            form.favicon = result.dataUrl;
        }
    }

    // if any errors, return early
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }


    // save
    try {
        await SubDomainModel.create(form);
        return { status: "success", message: 'Subdomain created successfully' };
    } catch (error) {
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function postEditDomain(domain_id, _prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const form = {
        locator_id: formData.get('locator_id'),
        meta_title: formData.get('meta_title'),
        meta_description: formData.get('meta_description'),
        custom_html_header: formData.get('header'),
        custom_html_footer: formData.get('footer'),
        custom_css: formData.get('custom_css'),
        custom_js: formData.get('custom_js'),
    }

    // validate if locator_id is a valid object id and exists in the database
    if(!isValidObjectId(form.locator_id)) {
        return { status: "error", errors: { locator_id: 'Invalid locator id' } };
    }
    const locator = await LocatorModel.findById(form.locator_id);
    if(!locator) {
        return { status: "error", errors: { locator_id: 'Locator not found' } };
    }


    // validate if header and footer are valid HTML
    let errors = {};
    if (form.header && !isValidHTML(form.header)) {
        errors.header = 'Header is not valid HTML';
    }
    if (form.footer && !isValidHTML(form.footer)) {
        errors.footer = 'Footer is not valid HTML';
    }

    if(form.custom_css && !isValidCSS(form.custom_css)) {
        errors.custom_css = 'Custom CSS is not valid CSS';
    }
    if(form.custom_js && !isValidJS(form.custom_js)) {
        errors.custom_js = 'Custom JS is not valid JS';
    }

    // validate + convert the favicon (only when a new file was uploaded so we
    // don't overwrite an existing favicon with an empty value)
    const favicon = formData.get('favicon');
    if (favicon && typeof favicon.arrayBuffer === 'function' && favicon.size > 0) {
        const result = await processFavicon(favicon);
        if (result.error) {
            errors.favicon = result.error;
        } else {
            form.favicon = result.dataUrl;
        }
    }

    // if any errors, return early
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }


    // save
    try {
        await SubDomainModel.findByIdAndUpdate(domain_id, form);
        return { status: "success", message: 'Subdomain updated successfully' };
    } catch (error) {
        return { status: "fatal", message: "Server error. Please try again." };
    }


}

export async function postDeleteSubDomain(subDomain_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    await SubDomainModel.findByIdAndDelete(subDomain_id);
    return { status: "success", message: 'Sub domain deleted successfully' };
}