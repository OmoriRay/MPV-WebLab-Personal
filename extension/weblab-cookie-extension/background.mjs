import {
    isSiteCookieDomain,
    serializeSiteCookies,
} from './cookie-export.mjs';

const SITES = [
    { site: 'youtube', queryDomain: 'youtube.com' },
    { site: 'bilibili', queryDomain: 'bilibili.com' },
];
// Only these session/authentication cookies trigger an event-driven export.
// Initial and manual exports still include every cookie in the site domain.
const IMPORTANT_COOKIE_NAMES = {
    youtube: new Set([
        'apisid', 'hsid', 'login_info', 'pref', 'sapisid',
        'sid', 'sidcc', 'socs', 'ssid', 'visitor_info1_live',
        'visitor_privacy_metadata', 'ysc',
    ]),
    bilibili: new Set([
        'bili_jct', 'buvid3', 'buvid4', 'buvid_fp', 'dedeuserid',
        'dedeuserid__ckmd5', 'live_buvid', 'sessdata', 'sid',
    ]),
};
const IMPORTANT_COOKIE_PATTERNS = {
    youtube: [
        /^(?:__secure-)?(?:1p|3p)?sid(?:ts|cc)?$/i,
        /^(?:__secure-)?(?:1p|3p)?apisid$/i,
        /^(?:__secure-)?(?:1p|3p)?sapisid$/i,
    ],
    bilibili: [],
};
const EXPORT_DELAY_MILLISECONDS = 5000;
const RETRY_DELAYS_MILLISECONDS = [30_000, 120_000, 600_000];
const NATIVE_HOST_NAME = 'mpv_weblab_youtube_cookie_sync';
const inFlightExports = new Set();

function siteEntry(site) {
    return SITES.find(entry => entry.site === site);
}

function stateKey(site) {
    return `syncStatus:${site}`;
}

function alarmName(site) {
    return `export-${site}-cookies`;
}

function shouldSyncForCookieChange(site, cookie) {
    if (!cookie || !isSiteCookieDomain(site, cookie.domain) ||
        typeof cookie.name !== 'string') {
        return false;
    }
    const name = cookie.name.toLowerCase();
    return IMPORTANT_COOKIE_NAMES[site]?.has(name) === true ||
        (IMPORTANT_COOKIE_PATTERNS[site] || []).some(pattern =>
            pattern.test(cookie.name));
}

async function readState(site) {
    const key = stateKey(site);
    const values = await chrome.storage.local.get([key]);
    return values[key] || {};
}

async function writeState(site, patch) {
    const current = await readState(site);
    const next = { site, ...current, ...patch };
    await chrome.storage.local.set({ [stateKey(site)]: next });
    await refreshActionBadge();
    return next;
}

async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte =>
        byte.toString(16).padStart(2, '0')).join('');
}

function classifySyncError(error) {
    const message = error instanceof Error && error.message
        ? error.message
        : '同步失败';
    const normalized = message.toLowerCase();
    if (/(native messaging|native host|host not found|本机同步程序|同步程序没有接受)/i
        .test(message)) {
        return {
            code: 'native-host',
            message,
            hint: '请确认 MPV-WebLab 的本机同步程序已安装并注册。',
        };
    }
    if (/(permission|access is denied|denied|权限)/i.test(normalized)) {
        return {
            code: 'permission',
            message,
            hint: '请确认扩展仍允许访问 YouTube 和 Bilibili 的 Cookie。',
        };
    }
    if (/(network|fetch|timeout|timed out|网络|连接)/i.test(normalized)) {
        return {
            code: 'network',
            message,
            hint: '请检查网络和网站登录状态，然后点击“立即同步”重试。',
        };
    }
    return {
        code: 'unknown',
        message,
        hint: '点击“立即同步”重试；如果持续失败，请检查本机同步程序。',
    };
}

async function refreshActionBadge() {
    if (!chrome.action?.setBadgeText) {
        return;
    }
    const keys = SITES.map(entry => stateKey(entry.site));
    const values = await chrome.storage.local.get(keys);
    const states = keys.map(key => values[key]?.status || 'idle');
    let text = '';
    let color = '#6b7280';
    let title = 'MPV WebLab Cookie 同步：等待首次同步';
    if (states.includes('error')) {
        text = '!';
        color = '#dc2626';
        title = 'MPV WebLab Cookie 同步失败，点击查看';
    } else if (states.includes('syncing')) {
        text = '↻';
        color = '#2563eb';
        title = 'MPV WebLab 正在同步 Cookie';
    } else if (states.includes('pending')) {
        text = '…';
        color = '#d97706';
        title = 'MPV WebLab Cookie 等待同步';
    } else if (states.every(status => status === 'ok')) {
        text = '✓';
        color = '#16803c';
        title = 'MPV WebLab Cookie 已同步';
    }
    await Promise.all([
        chrome.action.setBadgeText({ text }),
        chrome.action.setBadgeBackgroundColor({ color }),
        chrome.action.setTitle({ title }),
    ]);
}

async function scheduleExport(
    site,
    delay = EXPORT_DELAY_MILLISECONDS,
    reason = 'cookie-change',
    forceNative = false) {
    if (!siteEntry(site)) {
        return false;
    }
    const when = Date.now() + Math.max(0, delay);
    const current = await readState(site);
    if (current.dueAt && current.dueAt <= when &&
        ['pending', 'error'].includes(current.status) &&
        !forceNative) {
        return false;
    }
    await writeState(site, {
        status: 'pending',
        dueAt: when,
        reason,
        forceNative: Boolean(forceNative || current.forceNative),
        error: '',
        errorCode: '',
        errorHint: '',
    });
    chrome.alarms.create(alarmName(site), { when });
    return true;
}

async function scheduleAllExports(delay, reason, forceNative = false) {
    await Promise.all(SITES.map(entry =>
        scheduleExport(entry.site, delay, reason, forceNative)));
}

async function scheduleRetry(site, attempt, errorDetails) {
    const delay = RETRY_DELAYS_MILLISECONDS[
        Math.min(attempt - 1, RETRY_DELAYS_MILLISECONDS.length - 1)];
    const when = Date.now() + delay;
    await writeState(site, {
        status: 'error',
        lastAttemptAt: Date.now(),
        retryAttempt: attempt,
        dueAt: when,
        reason: 'retry',
        forceNative: true,
        error: errorDetails.message,
        errorCode: errorDetails.code,
        errorHint: errorDetails.hint,
    });
    chrome.alarms.create(alarmName(site), { when });
}

async function exportSiteCookies(entry) {
    const previous = await readState(entry.site);
    await writeState(entry.site, {
        status: 'syncing',
        lastAttemptAt: Date.now(),
        dueAt: 0,
        error: '',
    });
    try {
        const cookies = await chrome.cookies.getAll({ domain: entry.queryDomain });
        const text = serializeSiteCookies(entry.site, cookies);
        const contentHash = await sha256(text);
        let response = null;
        if (previous.forceNative || previous.contentHash !== contentHash) {
            response = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
                version: 1,
                operation: 'sync',
                site: entry.site,
                cookiesText: text,
            });
            if (response?.ok !== true) {
                throw new Error('本机同步程序没有接受 Cookie');
            }
        }
        const cookieCount = text.split('\n')
            .filter(line => line.split('\t').length >= 7).length;
        await writeState(entry.site, {
            status: 'ok',
            lastSyncAt: Date.now(),
            cookieCount,
            contentHash,
            hostVersion: response?.hostVersion || previous.hostVersion || '',
            changed: response?.changed === true,
            retryAttempt: 0,
            dueAt: 0,
            forceNative: false,
            error: '',
            errorCode: '',
            errorHint: '',
        });
    } catch (error) {
        const attempt = Math.max(0, Number(previous.retryAttempt) || 0) + 1;
        await scheduleRetry(entry.site, attempt, classifySyncError(error));
    }
}

async function handleAlarm(alarm) {
    const entry = SITES.find(candidate =>
        alarmName(candidate.site) === alarm?.name);
    if (!entry) {
        return;
    }
    if (inFlightExports.has(entry.site)) {
        await scheduleExport(entry.site, 1000, 'changed-during-sync', true);
        return;
    }
    inFlightExports.add(entry.site);
    try {
        await exportSiteCookies(entry);
    } finally {
        inFlightExports.delete(entry.site);
    }
}

async function checkNativeHealth() {
    try {
        const response = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
            version: 1,
            operation: 'status',
        });
        if (response?.ok !== true) {
            throw new Error('本机同步程序不可用');
        }
        const status = {
            status: 'ok',
            checkedAt: Date.now(),
            hostVersion: response.hostVersion || '',
            error: '',
            errorCode: '',
            errorHint: '',
        };
        await chrome.storage.local.set({ nativeHostStatus: status });
        return status;
    } catch (error) {
        const details = classifySyncError(error);
        const status = {
            status: 'error',
            checkedAt: Date.now(),
            hostVersion: '',
            error: details.message,
            errorCode: details.code,
            errorHint: details.hint,
        };
        await chrome.storage.local.set({ nativeHostStatus: status });
        return status;
    }
}

async function initialize() {
    for (const entry of SITES) {
        const state = await readState(entry.site);
        if (!state.status) {
            await scheduleExport(entry.site, 250, 'initial', true);
        } else if (state.status === 'syncing') {
            await scheduleExport(entry.site, 250, 'recover-interrupted', true);
        } else if (state.dueAt && ['pending', 'error'].includes(state.status)) {
            chrome.alarms.create(alarmName(entry.site), {
                when: Math.max(Date.now() + 100, state.dueAt),
            });
        }
    }
    await refreshActionBadge();
}

chrome.runtime.onInstalled.addListener(() => {
    void scheduleAllExports(250, 'installed', true);
    void checkNativeHealth();
});
chrome.runtime.onStartup.addListener(() => {
    void scheduleAllExports(250, 'startup', true);
    void checkNativeHealth();
});
chrome.cookies.onChanged.addListener(changeInfo => {
    for (const entry of SITES) {
        if (shouldSyncForCookieChange(entry.site, changeInfo?.cookie)) {
            void scheduleExport(entry.site);
        }
    }
});
chrome.alarms.onAlarm.addListener(alarm => {
    void handleAlarm(alarm);
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'sync-now' && siteEntry(message.site)) {
        scheduleExport(message.site, 0, 'manual', true)
            .then(() => sendResponse({ ok: true }))
            .catch(() => sendResponse({ ok: false }));
        return true;
    }
    if (message?.type === 'native-health') {
        checkNativeHealth()
            .then(status => sendResponse({ ok: status.status === 'ok', status }))
            .catch(() => sendResponse({ ok: false }));
        return true;
    }
    return false;
});

void initialize();
