function normalizePublicBaseUrl(publicBaseUrl = '') {
    return String(publicBaseUrl || '').trim().replace(/\/+$/, '');
}

function uploadPrefix(publicBaseUrl = '') {
    const base = normalizePublicBaseUrl(publicBaseUrl);
    return base ? `${base}/uploads/` : '/uploads/';
}

export function normalizeSharedMediaUrls(content = '', publicBaseUrl = '') {
    const targetUploads = uploadPrefix(publicBaseUrl);
    const source = String(content || '');

    return source
        .replace(/https?:\/\/[^"'\s<>)]*\/api\/uploads\//gi, targetUploads)
        .replace(/https?:\/\/[^"'\s<>)]*\/uploads\//gi, targetUploads)
        .replace(/(^|["'=\s(])\/?api\/uploads\//gi, `$1${targetUploads}`)
        .replace(/(^|["'=\s(])uploads\//gi, `$1${targetUploads}`);
}
