// ==UserScript==
// @name                    External Player · WebLab Safe
// @name:zh-CN              外部播放器 · WebLab 安全版
// @namespace               external-player/weblab-safe-local
// @version                 1.5.3
// @description             Launch supported video pages in MPV WebLab with a small, isolated W button.
// @icon                    data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAABgFBMVEUmQ2gWKUgAAAD3+f0bM1UiOFgiPmJSa4syUHdCWnk+VXLj6fGXpLdGWXUAAP9meJFSYnrS2eWKma1/f3+rtsZuiKj2uVlVVap0hJszQljd4+40SmlMZ4hVbo7FzdpZc5MAf39EXoD///8AVVVYaoVme5sAAH+LqMWjrr61wM/BmFaqv+m/v9/eqFe4klSxjVTa2v/G4v+CcFL/x1p/obt/ka1/jqPf//9oXk1fco3/v/9IZIdKYn9DX4OUqr9AXH5DWHdVVVVARUw9W38/P38A////0lsCHUIBGj0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADmIr8sAAAAgHRSTlP+/gD//v7+av6lpv///wH/////Av8s/wP/+f/bil7/TgKrAQP/LwIa////DAj///8HCf//Hhz/CP//BK+CwgzDmAP+1gQB////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIFj0NoAAAGsSURBVHjadZOJUttADIYlrbS2cRw7JibkDuFo6d1ytNBCT2jf/4mq3XVwPDj/jKW1/k+rxDMCchpRh0IRXDgjquZRW6cfiPo1sKLlXfxMv6M1PXjgJ81i6FD89V7vANqnGezQ0ZtVH0a0jHcBENEIVrffd/oQX+mICuwu38JSgbkDrKrtuYKFmQIR1Ka1W4eQIQkAcG5Sk7OWGJE1ZmlqemzhyANiOTbGDBkEyrKMGfBQ3/MngEV4YUwKwjdq9BD43L2y2KQGLJbqnDAPNQ0sQ2rMufY9AcJZaDVOOeYaD7EBWJgH2upH64/529OYaVU2AAu6GugEvXwiSi9cVwCsBwo3Q918olnP19gC9Dzx1w/wpc8mawDxfm30/uUB9F3cAIwnm8bU5RKlAdAD3lig+E9iClQCN4AT4zD8eXSfZDJ+P3bFLQARiqLw56woYjk4+FQD1QZoSYHHVyiRAh+n3cDFu184rgj+NDNawNsvGhM6hv7ZOum8Qp/pC9oH3Y3Xe9yF4PRUl0Y3a02fv42fjRFJtD/spu7o5fxHsretJKrI+WG7+8dd6+99+g9mbRtgFd0TWgAAAABJRU5ErkJggg==
// @icon64                  data:image/png;base64,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
// @match                   *://bilibili.com/*
// @match                   *://*.bilibili.com/*
// @match                   *://youtube.com/*
// @match                   *://*.youtube.com/*
// @match                   *://youtu.be/*
// @match                   *://twitch.tv/*
// @match                   *://*.twitch.tv/*
// @run-at                  document-body
// @noframes
// @grant                   none
// ==/UserScript==

(() => {
    'use strict';

    const VERSION = '1.5.3';
    const WEBLAB_MARK_URL = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cpolygon%20points%3D%2213%2C20%2020%2C20%2025%2C37%2030%2C23%2036%2C23%2041%2C37%2046%2C20%2053%2C20%2045%2C46%2038%2C46%2033%2C32%2028%2C46%2021%2C46%22%20fill%3D%22%23F4F8FF%22%2F%3E%3Cpolygon%20points%3D%2248%2C44%2056%2C49%2048%2C54%22%20fill%3D%22%23FFBD59%22%2F%3E%3C%2Fsvg%3E";
    const SCHEME_PREFIX = 'ush-weblab://MPVNET?v2.';
    const BUTTON_HOST_ID = 'mpv-weblab-lite-root';
    const LAUNCH_COOLDOWN_MS = 2000;
    const FALLBACK_ROUTE_CHECK_MS = 15_000;
    const VOD_MANIFEST_MAX_LENGTH = 16_000;
    const VOD_MANIFEST_TTL_MS = 5 * 60_000;
    const manifestCache = new Map();
    let lastUrl = '';
    let lastLaunchKey = '';
    let lastLaunchAt = 0;
    const VOD_PREFETCH_TIMEOUT_MS = 8000;
    const VOD_RETRY_BASE_MS = 15_000;
    const manifestFailures = new Map();
    let prefetchTask = null;
    let button;
    let toast;

    function isSafeHttpUrl(value) {
        if (typeof value !== 'string' ||
            /[\u0000-\u0020\u007f"]/.test(value)) {
            return false;
        }
        try {
            const parsed = new URL(value);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    function isSupportedPage(value) {
        if (!isSafeHttpUrl(value)) {
            return false;
        }
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
        if (host === 'youtu.be') {
            return /^\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname);
        }
        if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
            return (parsed.pathname === '/watch' && Boolean(parsed.searchParams.get('v'))) ||
                /^\/(?:shorts|live)\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname);
        }
        if (host === 'bilibili.com' || host === 'www.bilibili.com') {
            return /^\/video\/(?:BV[A-Za-z0-9]+|av\d+)(?:\/|$)/i.test(parsed.pathname) ||
                /^\/bangumi\/play\/(?:ep|ss)\d+(?:\/|$)/i.test(parsed.pathname) ||
                ((parsed.pathname === '/list/watchlater' ||
                    parsed.pathname === '/list/watchlater/') &&
                    parsed.searchParams.getAll('bvid').length === 1 &&
                    /^BV[A-Za-z0-9]{10}$/.test(parsed.searchParams.get('bvid') || ''));
        }
        if (host === 'live.bilibili.com') {
            return /^\/(?:blanc\/)?\d+(?:\/|$)/.test(parsed.pathname);
        }
        if (host === 'clips.twitch.tv') {
            return /^\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname);
        }
        if (!['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'].includes(host)) {
            return false;
        }
        if (/^\/videos\/\d+\/?$/.test(parsed.pathname) ||
            /^\/[A-Za-z0-9_]+\/clip\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname)) {
            return true;
        }
        const channel = parsed.pathname.match(/^\/([A-Za-z0-9_]+)\/?$/)?.[1];
        const reserved = new Set([
            'browse', 'directory', 'downloads', 'drops', 'following', 'inventory',
            'jobs', 'login', 'messages', 'p', 'search', 'settings', 'signup',
            'store', 'subscriptions', 'turbo', 'wallet', 'whispers',
        ]);
        return Boolean(channel) && !reserved.has(channel.toLowerCase());
    }

    function normalizePageUrl(value) {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
        if ((host === 'bilibili.com' || host === 'www.bilibili.com') &&
            (parsed.pathname === '/list/watchlater' ||
                parsed.pathname === '/list/watchlater/')) {
            const stable = new URL(`https://www.bilibili.com/video/${parsed.searchParams.get('bvid')}/`);
            const part = parsed.searchParams.get('p');
            if (/^[1-9]\d*$/.test(part || '')) {
                stable.searchParams.set('p', part);
            }
            return stable.href;
        }
        if (host === 'bilibili.com' || host === 'www.bilibili.com') {
            const video = parsed.pathname.match(/^\/video\/(BV[A-Za-z0-9]+|av\d+)\/?$/i);
            if (video) {
                const stable = new URL(`https://www.bilibili.com/video/${video[1]}/`);
                const part = parsed.searchParams.get('p');
                if (/^[1-9]\d*$/.test(part || '')) {
                    stable.searchParams.set('p', part);
                }
                return stable.href;
            }
            const bangumi = parsed.pathname.match(/^\/bangumi\/play\/(ep\d+|ss\d+)\/?$/i);
            if (bangumi) {
                return `https://www.bilibili.com/bangumi/play/${bangumi[1].toLowerCase()}/`;
            }
        }
        if (host === 'live.bilibili.com') {
            const room = parsed.pathname.match(/^\/(?:blanc\/)?(\d+)/)?.[1] ||
                parsed.searchParams.get('room_id');
            if (/^\d+$/.test(room || '')) {
                return `https://live.bilibili.com/${room}`;
            }
        }
        if (host === 'youtu.be') {
            return `https://youtu.be/${parsed.pathname.split('/').filter(Boolean)[0]}`;
        }
        if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
            if (parsed.pathname === '/watch') {
                return `https://www.youtube.com/watch?v=${encodeURIComponent(
                    parsed.searchParams.get('v') || '')}`;
            }
            return `https://www.youtube.com${parsed.pathname}`;
        }
        if (host === 'clips.twitch.tv') {
            return `https://clips.twitch.tv${parsed.pathname.replace(/\/$/, '')}`;
        }
        if (['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'].includes(host)) {
            return `https://www.twitch.tv${parsed.pathname.replace(/\/$/, '')}`;
        }
        return parsed.href;
    }

    function encodeBase64Url(value) {
        const bytes = new TextEncoder().encode(value);
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x4000) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function safeMediaUrls(item) {
        const values = [
            item?.baseUrl || item?.base_url,
            ...((item?.backupUrl || item?.backup_url) || []),
        ];
        return [...new Set(values)].filter(value => {
            try {
                const parsed = new URL(value);
                return parsed.protocol === 'https:' &&
                    (parsed.port === '' || parsed.port === '443' || parsed.port === '4483');
            } catch {
                return false;
            }
        }).slice(0, 3);
    }

    async function fetchJson(url, signal) {
        signal.throwIfAborted();
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            signal,
        });
        if (!response.ok) {
            throw new Error('request failed');
        }
        const data = await response.json();
        signal.throwIfAborted();
        return data;
    }

    async function resolveBilibiliVideo(pageUrl, signal) {
        const parsed = new URL(pageUrl);
        const video = parsed.pathname.match(/^\/video\/(BV[A-Za-z0-9]+|av(\d+))\/?$/i);
        if (video) {
            const query = video[1].toLowerCase().startsWith('av')
                ? `aid=${video[2]}`
                : `bvid=${video[1]}`;
            const response = await fetchJson(
                `https://api.bilibili.com/x/web-interface/view?${query}`, signal);
            const data = response.data;
            if (!data?.aid || !data?.pages?.length) {
                throw new Error('video metadata unavailable');
            }
            const requestedPart = Number(parsed.searchParams.get('p')) || 1;
            const page = data.pages[Math.max(0, requestedPart - 1)] || data.pages[0];
            let playlist = [];
            for (const section of data.ugc_season?.sections || []) {
                for (const episode of section.episodes || []) {
                    const bvid = episode.bvid || episode.arc?.bvid;
                    if (bvid) {
                        playlist.push([bvid, episode.title || episode.arc?.title || bvid]);
                    }
                }
            }
            if (playlist.length <= 1 && data.pages.length > 1) {
                playlist = data.pages.map((item, index) => [
                    `${data.bvid}?p=${item.page || index + 1}`,
                    item.part || `P${item.page || index + 1}`,
                ]);
            }
            return {
                aid: data.aid,
                cid: page.cid,
                key: requestedPart > 1 ? `${data.bvid}?p=${requestedPart}` : data.bvid,
                playlist: playlist.slice(0, 200),
            };
        }
        const episodeId = parsed.pathname.match(/^\/bangumi\/play\/ep(\d+)\/?$/i)?.[1];
        if (!episodeId) {
            throw new Error('unsupported bilibili page');
        }
        const response = await fetchJson(
            `https://api.bilibili.com/pgc/view/web/season?ep_id=${episodeId}`, signal);
        const sections = [...(response.result?.section || []), {
            episodes: response.result?.episodes || [],
        }];
        const playlist = [];
        let current;
        for (const section of sections) {
            for (const episode of section.episodes || []) {
                if (episode.id) {
                    playlist.push([
                        `ep${episode.id}`,
                        episode.share_copy || episode.long_title || episode.title || `ep${episode.id}`,
                    ]);
                }
                if (String(episode.id) === episodeId) {
                    current = episode;
                }
            }
        }
        if (!current?.aid || !current?.cid) {
            throw new Error('episode metadata unavailable');
        }
        return {
            aid: current.aid,
            cid: current.cid,
            key: `ep${episodeId}`,
            playlist: playlist.slice(0, 200),
        };
    }

    function chooseAudio(dash) {
        const candidates = [
            ...(dash?.audio || []),
            ...(dash?.dolby?.audio || []),
            ...(dash?.flac?.audio ? [dash.flac.audio] : []),
        ].map(item => ({ item, urls: safeMediaUrls(item) }))
            .filter(candidate => candidate.urls.length)
            .sort((left, right) =>
                (Number(right.item.bandwidth) || 0) - (Number(left.item.bandwidth) || 0));
        return candidates[0]?.urls;
    }

    function shrinkManifest(manifest) {
        let encoded = encodeBase64Url(JSON.stringify(manifest));
        if (encoded.length <= VOD_MANIFEST_MAX_LENGTH) {
            return encoded;
        }
        manifest.q = manifest.q.map(stream => ({ ...stream, b: [] }));
        encoded = encodeBase64Url(JSON.stringify(manifest));
        if (encoded.length <= VOD_MANIFEST_MAX_LENGTH) {
            return encoded;
        }
        manifest.l = manifest.l.map(item => [item[0]]);
        encoded = encodeBase64Url(JSON.stringify(manifest));
        if (encoded.length <= VOD_MANIFEST_MAX_LENGTH) {
            return encoded;
        }
        manifest.l = [];
        encoded = encodeBase64Url(JSON.stringify(manifest));
        return encoded.length <= VOD_MANIFEST_MAX_LENGTH ? encoded : '';
    }

    async function createBilibiliManifest(pageUrl, signal) {
        const info = await resolveBilibiliVideo(pageUrl, signal);
        const response = await fetchJson(
            `https://api.bilibili.com/x/player/playurl?qn=127&otype=json&fourk=1&fnver=0&fnval=4048&avid=${info.aid}&cid=${info.cid}`,
            signal);
        const data = response.data;
        const audio = chooseAudio(data?.dash);
        const streams = (data?.dash?.video || [])
            .filter(item => String(item.codecid) === '7')
            .map(item => {
                const urls = safeMediaUrls(item);
                return {
                    q: String(item.id),
                    c: '7',
                    w: Number(item.width) || 0,
                    h: Number(item.height) || 0,
                    f: String(item.frameRate || item.frame_rate || ''),
                    u: urls[0] || '',
                    b: urls.slice(1),
                };
            })
            .filter(stream => stream.u)
            .sort((left, right) => Number(right.q) - Number(left.q));
        if (!audio?.length || !streams.length) {
            throw new Error('dash unavailable');
        }
        const perQuality = new Map();
        for (const stream of streams) {
            if (!perQuality.has(stream.q)) {
                perQuality.set(stream.q, stream);
            }
        }
        const selectedStreams = [...perQuality.values()];
        const names = {};
        for (const format of data.support_formats || []) {
            if (format.quality) {
                names[String(format.quality)] = String(
                    format.new_description || format.display_desc || format.description || '');
            }
        }
        return shrinkManifest({
            v: 1,
            p: pageUrl,
            k: String(info.key || ''),
            cid: String(info.cid),
            pc: '7',
            s: { q: selectedStreams[0].q, c: '7' },
            a: audio[0],
            ab: audio.slice(1),
            q: selectedStreams,
            n: names,
            l: info.playlist,
        });
    }

    function isBilibiliVod(pageUrl) {
        try {
            const parsed = new URL(pageUrl);
            return parsed.hostname === 'www.bilibili.com' &&
                (/^\/video\//.test(parsed.pathname) ||
                    /^\/bangumi\/play\/ep\d+\/?$/.test(parsed.pathname));
        } catch {
            return false;
        }
    }

    function getCachedManifest(pageUrl) {
        const cached = manifestCache.get(pageUrl);
        if (!cached) {
            return '';
        }
        const age = Date.now() - cached.createdAt;
        if (age < 0 || age >= VOD_MANIFEST_TTL_MS) {
            manifestCache.delete(pageUrl);
            return '';
        }
        return cached.manifest;
    }

    function cancelManifestPrefetch() {
        if (!prefetchTask) return;
        const task = prefetchTask;
        prefetchTask = null;
        task.cancelled = true;
        clearTimeout(task.delayTimer);
        task.controller.abort();
    }

    function beginManifestPrefetch(pageUrl) {
        // Repeated clicks/checks must neither duplicate nor postpone the same work.
        if (prefetchTask?.pageUrl === pageUrl) return;
        cancelManifestPrefetch();
        if (!isBilibiliVod(pageUrl) || getCachedManifest(pageUrl)) return;
        const failure = manifestFailures.get(pageUrl);
        if (failure && Date.now() < failure.retryAt) return;
        const task = { pageUrl, controller: new AbortController(), cancelled: false };
        prefetchTask = task;
        task.delayTimer = setTimeout(async () => {
            let deadline;
            let onAbort;
            try {
                // Bound the entire metadata + playurl chain, including JSON bodies.
                const stopped = new Promise((_, reject) => {
                    onAbort = () => reject(new Error('prefetch cancelled'));
                    task.controller.signal.addEventListener('abort', onAbort, { once: true });
                    deadline = setTimeout(() => {
                        task.controller.abort();
                    }, VOD_PREFETCH_TIMEOUT_MS);
                });
                const manifest = await Promise.race([
                    createBilibiliManifest(pageUrl, task.controller.signal), stopped,
                ]);
                if (!manifest) throw new Error('manifest unavailable');
                if (!task.cancelled && !task.controller.signal.aborted) {
                    manifestFailures.delete(pageUrl);
                    manifestCache.set(pageUrl, { manifest, createdAt: Date.now() });
                    while (manifestCache.size > 5) {
                        manifestCache.delete(manifestCache.keys().next().value);
                    }
                }
            } catch {
                if (!task.cancelled) {
                    const attempts = Math.min((failure?.attempts || 0) + 1, 4);
                    manifestFailures.delete(pageUrl);
                    manifestFailures.set(pageUrl, {
                        attempts,
                        retryAt: Date.now() + VOD_RETRY_BASE_MS * 2 ** (attempts - 1),
                    });
                    while (manifestFailures.size > 5) {
                        manifestFailures.delete(manifestFailures.keys().next().value);
                    }
                }
            } finally {
                clearTimeout(deadline);
                task.controller.signal.removeEventListener('abort', onAbort);
                if (prefetchTask === task) prefetchTask = null;
            }
        }, 650);
    }

    function showToast(message, kind = '') {
        if (!toast) {
            return;
        }
        toast.textContent = message;
        toast.dataset.kind = kind;
        toast.classList.add('visible');
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => toast.classList.remove('visible'), 1600);
    }

    function buildLaunchRequest(pageUrl, manifest = '') {
        const payload = manifest ? { v: 1, u: pageUrl, m: manifest } : pageUrl;
        let request = SCHEME_PREFIX + encodeBase64Url(JSON.stringify(payload));
        if (request.length > 28 * 1024) {
            request = SCHEME_PREFIX + encodeBase64Url(JSON.stringify(pageUrl));
        }
        return request;
    }

    function launchCurrentPage() {
        if (!isSupportedPage(location.href)) {
            showToast('当前页面不支持', 'error');
            return;
        }
        const pageUrl = normalizePageUrl(location.href);
        const now = Date.now();
        if (lastLaunchKey === pageUrl && now - lastLaunchAt < LAUNCH_COOLDOWN_MS) {
            showToast('启动请求已发送');
            return;
        }
        const manifest = getCachedManifest(pageUrl);
        if (!manifest) {
            beginManifestPrefetch(pageUrl);
        }
        const request = buildLaunchRequest(pageUrl, manifest);
        lastLaunchKey = pageUrl;
        lastLaunchAt = now;
        button.disabled = true;
        button.dataset.state = 'busy';
        showToast(manifest ? '正在启动（已预取画质）' : '正在启动 MPV');
        try {
            window.open(request, '_self');
        } catch {
            showToast('无法交给系统启动', 'error');
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.dataset.state = '';
            }, 700);
        }
    }

    function installButtonReveal(host, wrap, launchButton) {
        const touchOnly = window.matchMedia?.('(hover: none)')?.matches === true;
        wrap.dataset.revealed = touchOnly ? 'true' : 'false';
        if (touchOnly) {
            return;
        }
        let nearby = false;
        let keyboardFocused = false;
        let windowFocused = true;
        let hideTimer = null;
        let frame = null;
        let pointer = null;
        const setRevealed = value => {
            if (wrap.dataset.revealed !== value) wrap.dataset.revealed = value;
        };
        const syncVisibility = () => {
            if (nearby || (keyboardFocused && windowFocused)) {
                clearTimeout(hideTimer);
                hideTimer = null;
                setRevealed('true');
            } else if (hideTimer === null && wrap.dataset.revealed === 'true') {
                // Do not restart this timer on every movement outside the button.
                hideTimer = setTimeout(() => {
                    hideTimer = null;
                    setRevealed('false');
                }, 500);
            }
        };
        const leave = () => {
            pointer = null;
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
            nearby = false;
            syncVisibility();
        };
        // Observe coordinates instead of placing a transparent hitbox over the page.
        window.addEventListener('pointermove', event => {
            if (event.pointerType === 'touch' || host.style.display === 'none') {
                leave();
                return;
            }
            pointer = { x: event.clientX, y: event.clientY };
            if (frame !== null) return;
            frame = requestAnimationFrame(() => {
                frame = null;
                if (!pointer || host.style.display === 'none') return;
                const rect = wrap.getBoundingClientRect();
                const margin = 24;
                nearby = rect.width > 0 && rect.height > 0 &&
                    pointer.x >= rect.left - margin && pointer.x <= rect.right + margin &&
                    pointer.y >= rect.top - margin && pointer.y <= rect.bottom + margin;
                syncVisibility();
            });
        }, { passive: true, capture: true });
        launchButton.addEventListener('focus', () => {
            keyboardFocused = launchButton.matches(':focus-visible');
            syncVisibility();
        });
        launchButton.addEventListener('blur', () => {
            keyboardFocused = false;
            syncVisibility();
        });
        window.addEventListener('blur', () => {
            windowFocused = false;
            leave();
        });
        window.addEventListener('focus', () => {
            windowFocused = true;
            syncVisibility();
        });
        window.addEventListener('resize', leave, { passive: true });
        document.addEventListener('pointerleave', leave, { passive: true });
        document.addEventListener('fullscreenchange', leave);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                windowFocused = false;
                leave();
            }
        });
    }

    function mountButton() {
        if (document.getElementById(BUTTON_HOST_ID) || !document.body) {
            return;
        }
        const host = document.createElement('div');
        host.id = BUTTON_HOST_ID;
        // Reserve the bottom control strip in Bilibili Live's web-player mode.
        host.dataset.site = new URL(location.href).hostname.toLowerCase().replace(/\.$/, '') ===
            'live.bilibili.com' ? 'bilibili-live' : '';
        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = `
          :host { all: initial; }
          .wrap {
            position: fixed;
            left: 16px;
            bottom: 16px;
            z-index: 2147483647;
            opacity: 0;
            pointer-events: none;
            transition: opacity .35s ease-in-out;
            font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
          }
          .wrap[data-revealed="true"] {
            opacity: 1;
            pointer-events: auto;
          }
          :host([data-site="bilibili-live"]) .wrap {
            bottom: 88px;
          }
          button {
            position: relative;
            display: grid;
            place-items: center;
            width: 52px;
            height: 52px;
            padding: 0;
            overflow: hidden;
            border: 1px solid rgba(130,160,195,.44);
            border-radius: 15px;
            color: #f8fafc;
            background:
              linear-gradient(155deg, rgba(41,74,114,.98), rgba(21,36,63,.98));
            box-shadow:
              0 8px 22px rgba(12,24,44,.26),
              inset 0 1px 0 rgba(244,248,255,.12);
            backdrop-filter: blur(14px) saturate(1.2);
            -webkit-backdrop-filter: blur(14px) saturate(1.2);
            cursor: pointer;
            isolation: isolate;
            transition: transform .16s cubic-bezier(.2,.8,.2,1), border-color .16s ease, box-shadow .16s ease;
          }
          button::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(120deg, transparent 34%, rgba(255,255,255,.09) 48%, transparent 62%);
            transform: translateX(-115%);
            transition: transform .42s cubic-bezier(.2,.8,.2,1);
            z-index: -1;
          }
          button:hover {
            transform: translateY(-2px);
            border-color: rgba(255,184,82,.48);
            box-shadow:
              0 16px 34px rgba(4,8,15,.4),
              0 3px 8px rgba(4,8,15,.3),
              0 0 0 1px rgba(255,164,45,.08),
              inset 0 1px 0 rgba(255,255,255,.16);
          }
          button:hover::before { transform: translateX(115%); }
          button:active {
            transform: translateY(1px) scale(.96);
            box-shadow: 0 5px 12px rgba(4,8,15,.32), inset 0 2px 5px rgba(0,0,0,.35);
          }
          button:focus-visible {
            outline: 3px solid rgba(255,173,61,.4);
            outline-offset: 3px;
          }
          .mark {
            display: block;
            width: 46px;
            height: 46px;
            font-size: 0;
            background: url("${WEBLAB_MARK_URL}") center / contain no-repeat;
          }
          .play {
            display: none;
          }
          button[data-state="busy"] { cursor: wait; border-color: rgba(255,173,61,.62); }
          button[data-state="busy"] .mark { animation: breathe .65s ease-in-out infinite alternate; }
          .toast {
            position: absolute;
            left: 62px;
            top: 7px;
            max-width: 240px;
            white-space: nowrap;
            padding: 8px 11px;
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 10px;
            color: #f8fafc;
            background: rgba(15,20,29,.94);
            box-shadow: 0 8px 24px rgba(4,8,15,.25);
            font-size: 12px;
            font-weight: 560;
            letter-spacing: .01em;
            opacity: 0;
            transform: translateX(-5px) scale(.98);
            transform-origin: left center;
            pointer-events: none;
            transition: opacity .16s ease, transform .16s ease;
          }
          .toast.visible { opacity: 1; transform: translateX(0) scale(1); }
          .toast[data-kind="error"] { background: rgba(116,28,35,.96); border-color: rgba(255,150,150,.18); }
          @keyframes breathe { to { opacity: .6; transform: scale(.94); } }
          @media (prefers-reduced-motion: reduce) {
            .wrap, button, button::before, .toast { transition: none; }
            button[data-state="busy"] .mark { animation: none; }
          }
        `;
        const wrap = document.createElement('div');
        wrap.className = 'wrap';
        button = document.createElement('button');
        button.type = 'button';
        button.title = `使用 MPV WebLab 打开 · v${VERSION}`;
        button.setAttribute('aria-label', '使用 MPV WebLab 打开当前视频');
        button.addEventListener('click', launchCurrentPage);
        const mark = document.createElement('span');
        mark.className = 'mark';
        mark.textContent = 'W';
        mark.setAttribute('aria-hidden', 'true');
        const play = document.createElement('span');
        play.className = 'play';
        play.setAttribute('aria-hidden', 'true');
        button.append(mark, play);
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        wrap.append(toast, button);
        shadow.append(style, wrap);
        document.body.appendChild(host);
        installButtonReveal(host, wrap, button);
    }

    function updateForRoute() {
        if (lastUrl === location.href) {
            if (!prefetchTask && isSupportedPage(location.href)) {
                beginManifestPrefetch(normalizePageUrl(location.href));
            }
            return;
        }
        lastUrl = location.href;
        mountButton();
        const supported = isSupportedPage(location.href);
        const host = document.getElementById(BUTTON_HOST_ID);
        if (host) {
            host.style.display = supported && !document.fullscreenElement ? '' : 'none';
        }
        if (supported) {
            beginManifestPrefetch(normalizePageUrl(location.href));
        } else {
            cancelManifestPrefetch();
        }
    }

    const testHook = globalThis.__MPV_WEBLAB_TEST_HOOK__;
    if (testHook) {
        Object.assign(testHook, {
            isSupportedPage,
            normalizePageUrl,
            encodeBase64Url,
            buildLaunchRequest,
            createBilibiliManifest,
        });
        if (testHook.skipRuntime) {
            return;
        }
    }

    // One runtime per page, including when a userscript manager reinjects it.
    const runtimeKey = Symbol.for('mpv-weblab-lite.runtime');
    if (window[runtimeKey]) return;
    window[runtimeKey] = true;
    // Preserve native this/return/throw semantics and notify only after success.
    for (const method of ['pushState', 'replaceState']) {
        const original = window.history?.[method];
        if (typeof original !== 'function') continue;
        try {
            window.history[method] = function (...args) {
                const result = Reflect.apply(original, this, args);
                updateForRoute();
                return result;
            };
        } catch {
            // Some hosts lock history methods; native events + polling remain.
        }
    }
    window.navigation?.addEventListener('navigatesuccess', updateForRoute);

    for (const eventName of [
        'urlchange', 'popstate', 'hashchange', 'yt-navigate-finish',
    ]) {
        window.addEventListener(eventName, updateForRoute, { passive: true });
    }
    document.addEventListener('fullscreenchange', () => {
        const host = document.getElementById(BUTTON_HOST_ID);
        if (host) {
            host.style.display = document.fullscreenElement ? 'none' :
                (isSupportedPage(location.href) ? '' : 'none');
        }
    });
    window.addEventListener('beforeunload', cancelManifestPrefetch);
    window.addEventListener('pagehide', cancelManifestPrefetch);
    setInterval(() => {
        if (!document.hidden) {
            updateForRoute();
        }
    }, FALLBACK_ROUTE_CHECK_MS);

    mountButton();
    updateForRoute();
})();
