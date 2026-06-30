import { Controller, Get } from '@nestjs/common';

const APP_VERSION = '1.0.2';
const GITHUB_RELEASE_URL = 'https://api.github.com/repos/Danborad/mynote/releases/latest';

@Controller('version')
export class VersionController {
    @Get()
    current() {
        return {
            version: APP_VERSION,
            github: 'https://github.com/Danborad/mynote',
        };
    }

    @Get('latest')
    async latest() {
        try {
            const response = await fetch(GITHUB_RELEASE_URL, {
                headers: {
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'MyNote/1.0.2',
                },
            });

            if (response.status === 404) {
                return {
                    ok: true,
                    current: APP_VERSION,
                    latest: null,
                    hasUpdate: false,
                    message: '暂无可用发布版本',
                };
            }

            if (!response.ok) {
                return {
                    ok: false,
                    current: APP_VERSION,
                    latest: null,
                    hasUpdate: false,
                    message: `GitHub 返回 ${response.status}`,
                };
            }

            const data = await response.json() as { tag_name?: string; html_url?: string };
            const latestVersion = data.tag_name || '';
            return {
                ok: true,
                current: APP_VERSION,
                latest: latestVersion,
                hasUpdate: compareVersions(latestVersion, APP_VERSION) > 0,
                releaseUrl: data.html_url || 'https://github.com/Danborad/mynote/releases',
            };
        } catch (error) {
            return {
                ok: false,
                current: APP_VERSION,
                latest: null,
                hasUpdate: false,
                message: error instanceof Error ? error.message : '检查更新失败',
            };
        }
    }
}

function normalizeVersion(version = '') {
    return version.replace(/^v/i, '').split(/[+-]/)[0];
}

function compareVersions(left: string, right: string) {
    const a = normalizeVersion(left).split('.').map((part) => Number.parseInt(part, 10) || 0);
    const b = normalizeVersion(right).split('.').map((part) => Number.parseInt(part, 10) || 0);
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
        if ((a[i] || 0) > (b[i] || 0)) return 1;
        if ((a[i] || 0) < (b[i] || 0)) return -1;
    }
    return 0;
}
