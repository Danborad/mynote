import { Capacitor } from '@capacitor/core';
import { applyLocalNoteColorChange } from '../utils/noteColorBehavior.js';

const TOKEN_KEY = 'token';
const SERVER_URL_KEY = 'mynote_server_url';
const LOCAL_USER_KEY = 'mynote_local_user_v1';
const LOCAL_NOTES_KEY = 'mynote_local_notes_v1';
const LOCAL_FOLDERS_KEY = 'mynote_local_folders_v1';

const ENV_API_BASE = (import.meta.env?.VITE_API_BASE || '').trim();

function safeParse(value, fallback) {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function nowIso() {
    return new Date().toISOString();
}

function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeServerUrl(url) {
    const raw = (url || '').trim();
    if (!raw) return '';

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;

    try {
        const parsed = new URL(withProtocol);
        const path = parsed.pathname.replace(/\/+$/, '');
        parsed.pathname = path.endsWith('/api') ? path : `${path}/api`;
        return parsed.toString().replace(/\/+$/, '');
    } catch {
        return '';
    }
}

export function getServerUrl() {
    return (localStorage.getItem(SERVER_URL_KEY) || '').trim();
}

export function setServerUrl(url) {
    const normalized = normalizeServerUrl(url);
    if (!normalized) {
        localStorage.removeItem(SERVER_URL_KEY);
        return '';
    }
    localStorage.setItem(SERVER_URL_KEY, normalized);
    return normalized;
}

export function clearServerUrl() {
    localStorage.removeItem(SERVER_URL_KEY);
}

export function getApiBase() {
    if (ENV_API_BASE) {
        return ENV_API_BASE.replace(/\/+$/, '');
    }

    const serverUrl = getServerUrl();
    if (serverUrl) {
        return serverUrl.replace(/\/+$/, '');
    }

    return '/api';
}

export const API_BASE = getApiBase();

function isAbsoluteUrl(value) {
    return /^(?:https?:|data:|blob:)/.test(value);
}

export function apiUrl(endpoint = '') {
    const base = getApiBase();
    if (!endpoint) return base;
    if (isAbsoluteUrl(endpoint)) return endpoint;
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${normalized}`;
}

export function toAbsoluteUrl(value) {
    if (!value) return value;

    if (/^(?:data:|blob:)/.test(value)) return value;

    const base = getApiBase();
    const apiOrigin = /^https?:\/\//.test(base)
        ? new URL(base).origin
        : (typeof window !== 'undefined' ? window.location.origin : '');

    try {
        const normalizeUploadsPath = (pathname = '') => pathname.replace(/^\/api\/uploads\//, '/uploads/');

        if (/^https?:\/\//.test(value)) {
            const parsed = new URL(value);
            const normalizedPath = normalizeUploadsPath(parsed.pathname);
            if (apiOrigin && normalizedPath.startsWith('/uploads/')) {
                return new URL(`${normalizedPath}${parsed.search}${parsed.hash}`, apiOrigin).toString();
            }
            return value;
        }

        if (value.startsWith('/')) {
            const normalized = normalizeUploadsPath(value);
            if (apiOrigin) {
                return new URL(normalized, apiOrigin).toString();
            }
            return normalized;
        }

        if (value.startsWith('uploads/')) {
            if (!apiOrigin) return `/${value}`;
            return new URL(`/${value}`, apiOrigin).toString();
        }

        if (value.startsWith('api/uploads/')) {
            if (!apiOrigin) return `/${value.slice(4)}`;
            return new URL(`/${value.slice(4)}`, apiOrigin).toString();
        }

        if (apiOrigin) {
            return new URL(value, `${apiOrigin}/`).toString();
        }
        return value;
    } catch {
        return value;
    }
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
    return !!getToken();
}

export function isRemoteConfigured() {
    if (!Capacitor.isNativePlatform()) {
        return true;
    }
    return /^https?:\/\//.test(getApiBase());
}

export function isSyncModeEnabled() {
    if (!Capacitor.isNativePlatform()) {
        return isAuthenticated();
    }
    return isRemoteConfigured() && isAuthenticated();
}

export function isNativeApp() {
    return Capacitor.isNativePlatform();
}

function getLocalUser() {
    const stored = safeParse(localStorage.getItem(LOCAL_USER_KEY), null);
    if (stored) return stored;

    const seed = {
        id: 'local-user',
        username: '本地用户',
        avatar: null,
        trashRetentionDays: 30,
        localOnly: true,
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(seed));
    return seed;
}

function saveLocalUser(user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    return user;
}

function readLocalNotes() {
    return safeParse(localStorage.getItem(LOCAL_NOTES_KEY), []);
}

function writeLocalNotes(notes) {
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
    return notes;
}

function readLocalFolders() {
    return safeParse(localStorage.getItem(LOCAL_FOLDERS_KEY), []);
}

function writeLocalFolders(folders) {
    localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
    return folders;
}

export function getLocalDataSummary() {
    const notes = readLocalNotes();
    const folders = readLocalFolders();
    return {
        notesTotal: notes.length,
        notesActive: notes.filter(note => !note.isDeleted).length,
        notesTrash: notes.filter(note => note.isDeleted).length,
        foldersTotal: folders.length,
    };
}

function normalizeDateValue(value) {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
}

function sortFoldersForMigration(folders) {
    return [...folders].sort((a, b) => {
        const aParent = a.parentId ? 1 : 0;
        const bParent = b.parentId ? 1 : 0;
        if (aParent !== bParent) return aParent - bParent;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
}

function sortNotesForMigration(notes) {
    return [...notes].sort((a, b) => normalizeDateValue(a.createdAt) - normalizeDateValue(b.createdAt));
}

function notesSort(a, b) {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
}

function stripHtml(html = '') {
    return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function estimateBytesFromDataUrl(url = '') {
    const marker = 'base64,';
    const idx = url.indexOf(marker);
    if (idx < 0) return 0;
    const b64 = url.slice(idx + marker.length);
    return Math.ceil((b64.length * 3) / 4);
}

function extractEmbeddedAssetsSize(notes) {
    let total = 0;
    for (const note of notes) {
        const content = String(note.content || '');
        const matches = content.match(/src=["'](data:[^"']+)["']/g) || [];
        for (const item of matches) {
            const src = item.replace(/^src=["']/, '').replace(/["']$/, '');
            total += estimateBytesFromDataUrl(src);
        }
    }
    return total;
}

async function request(endpoint, options = {}) {
    const token = getToken();

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(apiUrl(endpoint), config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '请求失败' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

async function requestBlob(endpoint, options = {}) {
    const token = getToken();

    const config = {
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(apiUrl(endpoint), config);
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '请求失败' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return {
        blob: await response.blob(),
        filename: response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'download.bin',
    };
}

export const authApi = {
    async register(username, password, captchaId, captchaText) {
        if (!isRemoteConfigured()) {
            throw new Error('请先在设置中填写服务器地址');
        }

        const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, captchaId, captchaText }),
        });
        if (data?.user?.avatar) {
            data.user.avatar = toAbsoluteUrl(data.user.avatar);
        }
        setToken(data.access_token);
        return data;
    },

    async login(username, password) {
        if (!isRemoteConfigured()) {
            throw new Error('请先在设置中填写服务器地址');
        }

        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        if (data?.user?.avatar) {
            data.user.avatar = toAbsoluteUrl(data.user.avatar);
        }
        setToken(data.access_token);
        return data;
    },

    logout() {
        clearToken();
    },

    async getProfile() {
        if (!Capacitor.isNativePlatform()) {
            if (!isAuthenticated()) {
                return null;
            }
            const data = await request('/auth/profile');
            if (data?.avatar) {
                data.avatar = toAbsoluteUrl(data.avatar);
            }
            return data;
        }

        if (!isSyncModeEnabled()) {
            return getLocalUser();
        }
        const data = await request('/auth/profile');
        if (data?.avatar) {
            data.avatar = toAbsoluteUrl(data.avatar);
        }
        return data;
    },

    async uploadAvatar(file) {
        if (!isSyncModeEnabled()) {
            if (!Capacitor.isNativePlatform()) {
                throw new Error('请先登录');
            }

            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('读取头像失败'));
                reader.readAsDataURL(file);
            });
            const user = { ...getLocalUser(), avatar: dataUrl };
            return saveLocalUser(user);
        }

        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(apiUrl('/auth/avatar'), {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
        });

        const data = await response.json();
        if (data?.avatar) {
            data.avatar = toAbsoluteUrl(data.avatar);
        }
        return data;
    },

    async updateSettings(settings) {
        if (!isSyncModeEnabled()) {
            if (!Capacitor.isNativePlatform()) {
                throw new Error('请先登录');
            }
            const user = { ...getLocalUser(), ...settings };
            return saveLocalUser(user);
        }

        return request('/auth/settings', {
            method: 'POST',
            body: JSON.stringify(settings),
        });
    },

    async changePassword(oldPassword, newPassword) {
        if (!isSyncModeEnabled()) {
            if (!Capacitor.isNativePlatform()) {
                throw new Error('请先登录');
            }
            throw new Error('离线模式下无需修改密码');
        }
        return request('/auth/password', {
            method: 'POST',
            body: JSON.stringify({ oldPassword, newPassword }),
        });
    },
};

export const adminApi = {
    async getOverview() {
        return request('/admin/overview')
    },

    async getSettings() {
        return request('/admin/settings')
    },

    async updateRegistration(allowRegistration) {
        return request('/admin/settings/registration', {
            method: 'PUT',
            body: JSON.stringify({ allowRegistration }),
        })
    },

    async exportBackup() {
        return requestBlob('/admin/backup/export')
    },

    async validateBackupImport(payload) {
        return request('/admin/backup/import/validate', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    async executeBackupImport(payload) {
        return request('/admin/backup/import/execute', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    async getUsers() {
        return request('/admin/users')
    },

    async createUser(payload) {
        return request('/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    async resetUserPassword(id, password) {
        return request(`/admin/users/${id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        })
    },

    async setUserStatus(id, isDisabled) {
        return request(`/admin/users/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isDisabled }),
        })
    },
};

export const captchaApi = {
    async get() {
        if (Capacitor.isNativePlatform() && !isRemoteConfigured()) {
            return {
                id: 'local-captcha',
                image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="%23f3f4f6"/><text x="60" y="26" text-anchor="middle" font-size="16" fill="%236b7280">LOCAL</text></svg>',
            };
        }

        const data = await request('/captcha');
        if (data?.image) {
            data.image = toAbsoluteUrl(data.image);
        }
        return data;
    },
};

export const notesApi = {
    async getAll(folderId) {
        if (isSyncModeEnabled()) {
            const query = folderId ? `?folderId=${folderId}` : '';
            return request(`/notes${query}`);
        }

        const notes = readLocalNotes().filter(n => !n.isDeleted);
        const filtered = folderId ? notes.filter(n => n.folderId === folderId) : notes;
        return [...filtered].sort(notesSort);
    },

    async getOne(id) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}`);
        }
        const note = readLocalNotes().find(n => n.id === id);
        if (!note) throw new Error('笔记不存在');
        return note;
    },

    async create(data) {
        if (isSyncModeEnabled()) {
            return request('/notes', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }

        const notes = readLocalNotes();
        const timestamp = nowIso();
        const note = {
            id: makeId('note'),
            title: data.title || '无标题笔记',
            content: data.content || '',
            folderId: data.folderId || null,
            isFavorite: false,
            isPinned: false,
            isDeleted: false,
            deletedAt: null,
            color: data.color || null,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        notes.unshift(note);
        writeLocalNotes(notes);
        return note;
    },

    async update(id, data) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        }

        const notes = readLocalNotes();
        const idx = notes.findIndex(n => n.id === id);
        if (idx < 0) throw new Error('笔记不存在');

        const next = {
            ...notes[idx],
            ...data,
            updatedAt: nowIso(),
        };
        notes[idx] = next;
        writeLocalNotes(notes);
        return next;
    },

    async delete(id) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}`, {
                method: 'DELETE',
            });
        }

        const notes = readLocalNotes();
        const idx = notes.findIndex(n => n.id === id);
        if (idx < 0) throw new Error('笔记不存在');

        notes[idx] = {
            ...notes[idx],
            isDeleted: true,
            deletedAt: nowIso(),
            updatedAt: nowIso(),
        };
        writeLocalNotes(notes);
    },

    async toggleFavorite(id) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}/favorite`, {
                method: 'POST',
            });
        }

        const notes = readLocalNotes();
        const idx = notes.findIndex(n => n.id === id);
        if (idx < 0) throw new Error('笔记不存在');

        notes[idx] = {
            ...notes[idx],
            isFavorite: !notes[idx].isFavorite,
            updatedAt: nowIso(),
        };
        writeLocalNotes(notes);
        return notes[idx];
    },

    async togglePin(id) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}/pin`, {
                method: 'POST',
            });
        }

        const notes = readLocalNotes();
        const idx = notes.findIndex(n => n.id === id);
        if (idx < 0) throw new Error('笔记不存在');

        notes[idx] = {
            ...notes[idx],
            isPinned: !notes[idx].isPinned,
            updatedAt: nowIso(),
        };
        writeLocalNotes(notes);
        return notes[idx];
    },

    async setColor(id, color) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}/color`, {
                method: 'POST',
                body: JSON.stringify({ color }),
            });
        }

        const notes = readLocalNotes();
        const idx = notes.findIndex(n => n.id === id);
        if (idx < 0) throw new Error('笔记不存在');

        notes[idx] = applyLocalNoteColorChange(notes[idx], color);
        writeLocalNotes(notes);
        return notes[idx];
    },

    async getFavorites() {
        if (isSyncModeEnabled()) {
            return request('/notes/favorites');
        }

        return readLocalNotes().filter(n => n.isFavorite && !n.isDeleted).sort(notesSort);
    },

    async getTrash() {
        if (isSyncModeEnabled()) {
            return request('/notes/trash');
        }

        return readLocalNotes()
            .filter(n => n.isDeleted)
            .sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
    },

    async restore(id) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}/restore`, {
                method: 'POST',
            });
        }

        return notesApi.update(id, { isDeleted: false, deletedAt: null });
    },

    async permanentDelete(id) {
        if (isSyncModeEnabled()) {
            return request(`/notes/${id}/permanent`, {
                method: 'DELETE',
            });
        }

        const next = readLocalNotes().filter(n => n.id !== id);
        writeLocalNotes(next);
    },

    async emptyTrash() {
        if (isSyncModeEnabled()) {
            return request('/notes/trash/empty', {
                method: 'DELETE',
            });
        }

        const next = readLocalNotes().filter(n => !n.isDeleted);
        writeLocalNotes(next);
    },

    async search(query) {
        if (isSyncModeEnabled()) {
            return request(`/notes/search?q=${encodeURIComponent(query)}`);
        }

        const q = String(query || '').trim().toLowerCase();
        if (!q) return [];
        return readLocalNotes()
            .filter(n => !n.isDeleted)
            .filter(n => {
                const title = String(n.title || '').toLowerCase();
                const content = stripHtml(n.content).toLowerCase();
                return title.includes(q) || content.includes(q);
            })
            .sort(notesSort);
    },

    async getStats() {
        if (isSyncModeEnabled()) {
            return request('/notes/stats');
        }

        const notes = readLocalNotes();
        const active = notes.filter(n => !n.isDeleted);
        const totalWordCount = active.reduce((sum, n) => sum + stripHtml(n.content).length, 0);

        return {
            totalNotes: active.length,
            favoritesCount: active.filter(n => n.isFavorite).length,
            pinnedCount: active.filter(n => n.isPinned).length,
            trashCount: notes.filter(n => n.isDeleted).length,
            totalWordCount,
        };
    },

    async createShareLink(id) {
        if (!isSyncModeEnabled()) {
            throw new Error('离线模式不支持外链分享');
        }
        return request(`/notes/${id}/share`, {
            method: 'POST',
        });
    },

    async getShareInfo(id) {
        if (!isSyncModeEnabled()) {
            return { enabled: false, shareUrl: null, shareToken: null, sharedAt: null };
        }
        return request(`/notes/${id}/share`);
    },

    async revokeShareLink(id) {
        if (!isSyncModeEnabled()) {
            throw new Error('离线模式不支持链接分享');
        }
        return request(`/notes/${id}/share`, {
            method: 'DELETE',
        });
    },

    async getSharedLinks() {
        if (!isSyncModeEnabled()) {
            return [];
        }
        return request('/notes/shared-links');
    },

    async getSharedNote(token) {
        const response = await fetch(apiUrl(`/notes/shared/${token}`));
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data?.message || '分享内容不存在或已失效');
        }
        return response.json();
    },
};

export const filesApi = {
    async getStats() {
        if (isSyncModeEnabled()) {
            return request('/files/stats');
        }

        const notes = readLocalNotes();
        const used = extractEmbeddedAssetsSize(notes);
        const limit = 256 * 1024 * 1024;
        return {
            used,
            limit,
            percentage: Math.min(100, Math.round((used / limit) * 100)),
        };
    },
};

export const foldersApi = {
    async getAll() {
        if (isSyncModeEnabled()) {
            return request('/folders/all');
        }

        return readLocalFolders().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },

    async getRootFolders() {
        if (isSyncModeEnabled()) {
            return request('/folders');
        }

        return readLocalFolders().filter(f => !f.parentId);
    },

    async getChildren(parentId) {
        if (isSyncModeEnabled()) {
            return request(`/folders?parentId=${parentId}`);
        }

        return readLocalFolders().filter(f => f.parentId === parentId);
    },

    async create(data) {
        if (isSyncModeEnabled()) {
            return request('/folders', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }

        const folders = readLocalFolders();
        const folder = {
            id: makeId('folder'),
            name: data.name || '新建分组',
            parentId: data.parentId || null,
            sortOrder: folders.length + 1,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        };
        folders.push(folder);
        writeLocalFolders(folders);
        return folder;
    },

    async update(id, data) {
        if (isSyncModeEnabled()) {
            return request(`/folders/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        }

        const folders = readLocalFolders();
        const idx = folders.findIndex(f => f.id === id);
        if (idx < 0) throw new Error('文件夹不存在');

        folders[idx] = {
            ...folders[idx],
            ...data,
            updatedAt: nowIso(),
        };
        writeLocalFolders(folders);
        return folders[idx];
    },

    async delete(id) {
        if (isSyncModeEnabled()) {
            return request(`/folders/${id}`, {
                method: 'DELETE',
            });
        }

        const nextFolders = readLocalFolders().filter(f => f.id !== id && f.parentId !== id);
        writeLocalFolders(nextFolders);

        const notes = readLocalNotes().map(note => {
            if (note.folderId !== id) return note;
            return { ...note, folderId: null, updatedAt: nowIso() };
        });
        writeLocalNotes(notes);
    },
};

export function clearLocalData() {
    writeLocalNotes([]);
    writeLocalFolders([]);
}

export async function migrateLocalDataToRemote() {
    if (!isSyncModeEnabled()) {
        throw new Error('请先连接服务器并登录后再迁移');
    }

    const localFolders = sortFoldersForMigration(readLocalFolders());
    const localNotes = sortNotesForMigration(readLocalNotes());

    const folderMap = new Map();
    const pendingFolders = [...localFolders];
    let folderGuard = 0;

    while (pendingFolders.length > 0 && folderGuard < localFolders.length + 10) {
        folderGuard += 1;
        let progressed = false;

        for (let i = pendingFolders.length - 1; i >= 0; i -= 1) {
            const folder = pendingFolders[i];
            const parentReady = !folder.parentId || folderMap.has(folder.parentId);
            if (!parentReady) continue;

            const created = await foldersApi.create({
                name: folder.name,
                parentId: folder.parentId ? folderMap.get(folder.parentId) : null,
            });
            folderMap.set(folder.id, created.id);
            pendingFolders.splice(i, 1);
            progressed = true;
        }

        if (!progressed) break;
    }

    for (const folder of pendingFolders) {
        const created = await foldersApi.create({
            name: folder.name,
            parentId: null,
        });
        folderMap.set(folder.id, created.id);
    }

    const result = {
        migratedFolders: folderMap.size,
        migratedNotes: 0,
        migratedTrashNotes: 0,
        failedNotes: 0,
        totalLocalNotes: localNotes.length,
    };

    for (const note of localNotes) {
        try {
            const created = await notesApi.create({
                title: note.title || '无标题笔记',
                content: note.content || '',
                folderId: note.folderId ? folderMap.get(note.folderId) || null : null,
            });

            if (note.color) {
                await notesApi.setColor(created.id, note.color);
            }
            if (note.isFavorite) {
                await notesApi.toggleFavorite(created.id);
            }
            if (note.isPinned) {
                await notesApi.togglePin(created.id);
            }
            if (note.isDeleted) {
                await notesApi.delete(created.id);
                result.migratedTrashNotes += 1;
            }

            result.migratedNotes += 1;
        } catch {
            result.failedNotes += 1;
        }
    }

    return result;
}
