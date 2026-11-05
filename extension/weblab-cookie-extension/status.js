const EXPECTED_EXTENSION_VERSION = '0.5.2';
const labels = {
    ok: '已同步',
    error: '同步失败',
    pending: '已排队',
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
    return values;
}

async function sendMessage(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (response?.ok !== true) {
        throw new Error(response?.status?.errorHint || response?.status?.error || '操作失败，请重试。');
    }
    return response;
}

function showActionError(root, error) {
    const status = root.querySelector('.status');
    status.textContent = '操作失败';
    status.className = 'status error';
    root.querySelector('.detail').textContent =
        `请求失败：${error?.message || '扩展后台不可用，请重新加载扩展。'}`;
}

for (const button of document.querySelectorAll('[data-sync]')) {
    button.addEventListener('click', async () => {
        const root = button.closest('[data-site]');
        const site = root.dataset.site;
        button.disabled = true;
        try {
            await sendMessage({ type: 'sync-now', site });
            const values = await render();
            const state = values[`syncStatus:${site}`];
            if (!state?.status || state.status === 'pending') {
                const status = root.querySelector('.status');
                status.textContent = '已排队';
                status.className = 'status pending';
                root.querySelector('.detail').textContent = '同步请求已排队，完成后会更新状态。';
            }
        } catch (error) {
            showActionError(root, error);
        } finally {
            button.disabled = false;
        }
    });
}

document.querySelector('[data-health]').addEventListener('click', async event => {
    const button = event.currentTarget;
    const root = document.querySelector('[data-native-host]');
    button.disabled = true;
    try {
        await sendMessage({ type: 'native-health' });
        await render();
    } catch (error) {
        showActionError(root, error);
    } finally {
        button.disabled = false;
    }
});

document.querySelector('[data-reload]').addEventListener('click', () => {
    chrome.runtime.reload();
    window.close();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && Object.keys(changes).some(key =>
        key.startsWith('syncStatus:') || key === 'nativeHostStatus')) {
        void render().catch(error => {
            for (const root of document.querySelectorAll('[data-site], [data-native-host]')) {
                showActionError(root, error);
            }
        });
    }
});

renderVersion();
render().catch(() => {
    for (const node of document.querySelectorAll('.status')) {
        node.textContent = '状态不可用';
        node.className = 'status error';
    }
});
