// The social networks a location can link to — code, display label and brand
// colour, with no JSX and no react-icons import.
//
// Split out of `utils/constant/index.js` (which builds the icon elements) so
// server-only code can whitelist the codes without pulling the icon library
// into a serverless bundle. `SOCIAL_MEDIA_LINKS` is derived from this list, so
// the two can't drift: add a network here and give it an icon there.
export const SOCIAL_MEDIA = [
    { code: 'facebook', label: 'Facebook', color: '#1877F2' },
    { code: 'twitter', label: 'Twitter', color: '#1DA1F2' },
    { code: 'instagram', label: 'Instagram', color: '#E4405F' },
    { code: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
    { code: 'youtube', label: 'YouTube', color: '#FF0000' },
    { code: 'tiktok', label: 'TikTok', color: '#010101' },
    { code: 'pinterest', label: 'Pinterest', color: '#BD081C' },
    { code: 'snapchat', label: 'Snapchat', color: '#FFFC00' },
    { code: 'reddit', label: 'Reddit', color: '#FF4500' },
    { code: 'telegram', label: 'Telegram', color: '#26A5E4' },
    { code: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
    { code: 'viber', label: 'Viber', color: '#7360F2' },
    { code: 'weibo', label: 'Weibo', color: '#E6162D' },
    { code: 'qq', label: 'QQ', color: '#12B7F5' },
    { code: 'line', label: 'Line', color: '#06C755' },
    { code: 'skype', label: 'Skype', color: '#00AFF0' },
];

/** Just the codes, in display order — what a stored `social_media_links.code` must be. */
export const SOCIAL_MEDIA_CODES = SOCIAL_MEDIA.map((m) => m.code);

/**
 * Hostname fragments that identify a network from a bare URL, so a CSV can give
 * `https://facebook.com/mystore` without naming the network. Only unambiguous
 * domains are listed; anything else has to be written as `code=url`.
 */
export const SOCIAL_MEDIA_HOSTS = {
    'facebook.com': 'facebook',
    'fb.com': 'facebook',
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'instagram.com': 'instagram',
    'linkedin.com': 'linkedin',
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'tiktok.com': 'tiktok',
    'pinterest.com': 'pinterest',
    'snapchat.com': 'snapchat',
    'reddit.com': 'reddit',
    't.me': 'telegram',
    'telegram.me': 'telegram',
    'wa.me': 'whatsapp',
    'whatsapp.com': 'whatsapp',
    'viber.com': 'viber',
    'weibo.com': 'weibo',
    'qq.com': 'qq',
    'line.me': 'line',
    'skype.com': 'skype',
};
