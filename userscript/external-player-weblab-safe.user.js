// ==UserScript==
// @name                    External Player · WebLab Safe
// @name:zh-CN              外部播放器 · WebLab 安全版
// @namespace               external-player/weblab-safe-local
// @version                 1.5.1
// @description             Launch supported video pages in MPV WebLab with a small, isolated W button.
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

    const VERSION = '1.5.1';
    const SCHEME_PREFIX = 'ush-weblab://MPVNET?v2.';
    const BUTTON_HOST_ID = 'mpv-weblab-lite-root';
    const LAUNCH_COOLDOWN_MS = 2000;
    const FALLBACK_ROUTE_CHECK_MS = 15_000;
    const VOD_MANIFEST_MAX_LENGTH = 16_000;
    const manifestCache = new Map();
    let lastUrl = '';
    let lastLaunchKey = '';
    let lastLaunchAt = 0;
    let prefetchController = null;
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
            return `https://www.bilibili.com/video/${parsed.searchParams.get('bvid')}/`;
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
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            signal,
        });
        if (!response.ok) {
            throw new Error('request failed');
        }
        return response.json();
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

    function beginManifestPrefetch(pageUrl) {
        prefetchController?.abort();
        prefetchController = null;
        if (!isBilibiliVod(pageUrl) || manifestCache.has(pageUrl)) {
            return;
        }
        const controller = new AbortController();
        prefetchController = controller;
        setTimeout(() => {
            if (controller.signal.aborted) {
                return;
            }
            createBilibiliManifest(pageUrl, controller.signal)
                .then(manifest => {
                    if (manifest) {
                        manifestCache.set(pageUrl, manifest);
                        while (manifestCache.size > 5) {
                            manifestCache.delete(manifestCache.keys().next().value);
                        }
                    }
                })
                .catch(() => undefined);
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
        const manifest = manifestCache.get(pageUrl);
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

    function mountButton() {
        if (document.getElementById(BUTTON_HOST_ID) || !document.body) {
            return;
        }
        const host = document.createElement('div');
        host.id = BUTTON_HOST_ID;
        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = `
          :host { all: initial; }
          .wrap {
            position: fixed;
            left: 16px;
            bottom: 16px;
            z-index: 2147483647;
            font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
          }
          button {
            position: relative;
            display: grid;
            place-items: center;
            width: 52px;
            height: 52px;
            padding: 0;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,.19);
            border-radius: 17px;
            color: #f8fafc;
            background:
              radial-gradient(circle at 28% 18%, rgba(255,255,255,.18), transparent 34%),
              linear-gradient(145deg, rgba(35,45,61,.97), rgba(12,17,25,.98));
            box-shadow:
              0 12px 28px rgba(4,8,15,.34),
              0 2px 6px rgba(4,8,15,.28),
              inset 0 1px 0 rgba(255,255,255,.13),
              inset 0 -1px 0 rgba(0,0,0,.48);
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
            font-size: 19px;
            line-height: 1;
            font-weight: 720;
            letter-spacing: -.055em;
            text-shadow: 0 1px 2px rgba(0,0,0,.6);
            transform: translateX(-1px);
          }
          .play {
            position: absolute;
            right: 7px;
            bottom: 7px;
            width: 0;
            height: 0;
            border-top: 4px solid transparent;
            border-bottom: 4px solid transparent;
            border-left: 6px solid #ffad3d;
            filter: drop-shadow(0 1px 2px rgba(255,137,22,.38));
          }
          button[data-state="busy"] { cursor: wait; border-color: rgba(255,173,61,.62); }
          button[data-state="busy"] .play { animation: breathe .65s ease-in-out infinite alternate; }
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
          @keyframes breathe { to { opacity: .36; transform: scale(.76); } }
          @media (prefers-reduced-motion: reduce) {
            button, button::before, .toast { transition: none; }
            button[data-state="busy"] .play { animation: none; }
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
    }

    function updateForRoute() {
        if (lastUrl === location.href) {
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
            prefetchController?.abort();
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
    window.addEventListener('beforeunload', () => prefetchController?.abort());
    setInterval(() => {
        if (!document.hidden) {
            updateForRoute();
        }
    }, FALLBACK_ROUTE_CHECK_MS);

    mountButton();
    updateForRoute();
})();
