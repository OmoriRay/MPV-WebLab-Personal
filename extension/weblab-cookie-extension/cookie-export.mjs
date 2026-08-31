const SITE_BASE_DOMAINS = {
    youtube: 'youtube.com',
    bilibili: 'bilibili.com',
};

function isSafeCookieField(value) {
    return typeof value === 'string' && !/[\t\r\n]/.test(value);
}

export function isSiteCookieDomain(site, domain) {
    const baseDomain = SITE_BASE_DOMAINS[site];
    if (!baseDomain || !isSafeCookieField(domain)) {
        return false;
    }
    const normalized = domain.replace(/^\./, '').toLowerCase();
    return normalized === baseDomain ||
        normalized.endsWith(`.${baseDomain}`);
}

export function isYoutubeCookieDomain(domain) {
    return isSiteCookieDomain('youtube', domain);
}

export function serializeSiteCookies(site, cookies) {
    if (!SITE_BASE_DOMAINS[site]) {
        throw new Error('Unknown cookie site');
    }
    const lines = [
        '# Netscape HTTP Cookie File',
        '# Generated locally for MPV WebLab. Do not share.',
    ];

    for (const cookie of Array.isArray(cookies) ? cookies : []) {
        if (!cookie ||
            !isSiteCookieDomain(site, cookie.domain) ||
            !isSafeCookieField(cookie.name) ||
            !isSafeCookieField(cookie.value)) {
            continue;
        }

        const domain = cookie.domain.toLowerCase();
        const path = isSafeCookieField(cookie.path) && cookie.path.startsWith('/')
            ? cookie.path
            : '/';
        const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
        const secure = cookie.secure === true ? 'TRUE' : 'FALSE';
        const expires = Number.isFinite(cookie.expirationDate) &&
            cookie.expirationDate > 0
            ? Math.floor(cookie.expirationDate)
            : 0;
        const outputDomain = cookie.httpOnly === true
            ? `#HttpOnly_${domain}`
            : domain;

        lines.push([
            outputDomain,
            includeSubdomains,
            path,
            secure,
            expires,
            cookie.name,
            cookie.value,
        ].join('\t'));
    }

    return `${lines.join('\n')}\n`;
}

export function serializeYoutubeCookies(cookies) {
    return serializeSiteCookies('youtube', cookies);
}
