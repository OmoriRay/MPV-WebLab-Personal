const EXPECTED_EXTENSION_VERSION = '0.5.1';
const labels = {
    ok: '已同步',
    error: '同步失败',
    pending: '等待同步',
    syncing: '正在同步',
};

function formatTime(value, prefix = '最近同步') {
    if (!Number.isFinite(value) || value <= 0) {
        return '尚未同步';
    }
    return `${prefix}：${new Date(value).toLocaleString()}`;
}

function formatError(state) {
    const message = state.error || '同步失败';
    const hint = state.errorHint || '点击“立即同步”重试。';
    const attempts = Number(state.retryAttempt) || 0;
    const retryCount = attempts > 0 ? `已自动重试 ${attempts} 次` : '';
    return [message, hint, retryCount].filter(Boolean).join('；');
}

function renderVersion() {
    const installed = chrome.runtime.getManifest().version;
    document.querySelector('.version').textContent = `v${installed}`;
    document.querySelector('[data-version-notice]').classList.toggle(
        'visible', installed !== EXPECTED_EXTENSION_VERSION);
}

function renderSite(site, state) {
    const root = document.querySelector(`[data-site="${site}"]`);
    const statusNode = root.querySelector('.status');
    statusNode.textContent = labels[state.status] || '等待首次同步';
    statusNode.className = `status ${state.status || ''}`;
    root.querySelector('.time').textContent = formatTime(
        state.lastSyncAt || state.lastAttemptAt,
        state.lastSyncAt ? '最近同步' : '最近尝试');
    let detail = '';
    if (state.status === 'error') {
        detail = formatError(state);
        if (state.dueAt) {
            detail += `；下次重试：${new Date(state.dueAt).toLocaleTimeString()}`;
        }
    } else if (state.status === 'ok') {
        detail = `${Number(state.cookieCount) || 0} 条 Cookie`;
        if (state.hostVersion) {
            detail += ` · 宿主 v${state.hostVersion}`;
        }
        if (state.changed === false) {
            detail += ' · 内容未变化';
        }
    }
    root.querySelector('.detail').textContent = detail;
}

function renderHost(status) {
    const root = document.querySelector('[data-native-host]');
    const statusNode = root.querySelector('.status');
    statusNode.textContent = status.status === 'ok' ? '连接正常' :
        status.status === 'error' ? '连接失败' : '尚未检查';
    statusNode.className = `status ${status.status || ''}`;
    root.querySelector('.detail').textContent = status.status === 'ok'
        ? `宿主版本：v${status.hostVersion || '未知'}`
        : status.status === 'error'
            ? formatError(status)
            : '点击“检查”验证本机同步程序';
}

async function render() {
    const keys = [
        'syncStatus:youtube',
        'syncStatus:bilibili',
        'nativeHostStatus',
    ];
    const values = await chrome.storage.local.get(keys);
    renderSite('youtube', values['syncStatus:youtube'] || {});
    renderSite('bilibili', values['syncStatus:bilibili'] || {});
    renderHost(values.nativeHostStatus || {});
}

async function sendMessage(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (response?.ok !== true) {
        throw new Error('操作失败');
    }
}

for (const button of document.querySelectorAll('[data-sync]')) {
    button.addEventListener('click', async () => {
        const site = button.closest('[data-site]').dataset.site;
        button.disabled = true;
        try {
            await sendMessage({ type: 'sync-now', site });
            await render();
        } finally {
            button.disabled = false;
        }
    });
}

document.querySelector('[data-health]').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try {
        await sendMessage({ type: 'native-health' });
        await render();
    } finally {
        event.currentTarget.disabled = false;
    }
});

document.querySelector('[data-reload]').addEventListener('click', () => {
    chrome.runtime.reload();
    window.close();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && Object.keys(changes).some(key =>
        key.startsWith('syncStatus:') || key === 'nativeHostStatus')) {
        void render();
    }
});

renderVersion();
render().catch(() => {
    for (const node of document.querySelectorAll('.status')) {
        node.textContent = '状态不可用';
        node.className = 'status error';
    }
});
