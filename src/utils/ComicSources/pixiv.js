import http from 'http';
import fs from 'fs';
import { md5 } from '../JMComic/crypto';
import { cacheUrls, stripHtml, WEB_UA } from './helpers';
import Storage from '../Storage/Storage';

const API = 'https://app-api.pixiv.net';
const OAUTH = 'https://oauth.secure.pixiv.net';
const WEB = 'https://www.pixiv.net';
const IMAGE_PROXY = 'https://i.pixiv.re';
const CLIENT_ID = 'MOBrBDS8blbauoSckZ0fDbtuzpyT';
const CLIENT_SECRET = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj';
const HASH_SALT = '28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c';
const storage = new Storage();

function jsonBody(response, label) {
    const status = Number(response && (response.status || response.statusCode));
    let body = response && response.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); }
        catch (_) { throw new Error(`${label}返回了无效数据`); }
    }
    if (status && (status < 200 || status >= 400)) {
        const message = body && (body.error_description || body.message || body.error);
        const error = new Error(message || `${label} HTTP ${status}`);
        error.status = status;
        throw error;
    }
    if (!body || typeof body !== 'object') throw new Error(`${label}返回了空数据`);
    if (body.error && !body.body && !body.illusts) {
        const error = new Error(body.error.message || body.error_description || 'Pixiv 请求失败');
        error.status = status || 400;
        throw error;
    }
    return body;
}

function formEncode(data) {
    return Object.keys(data).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key] == null ? '' : data[key])}`).join('&');
}

function clientTime() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function oauthHeaders() {
    const time = clientTime();
    return {
        'X-Client-Time': time,
        'X-Client-Hash': md5(time + HASH_SALT),
        'User-Agent': 'PixivAndroidApp/5.0.166 (Android 6.0; Pixel C)',
        'App-OS': 'Android',
        'App-OS-Version': 'Android 6.0',
        'App-Version': '5.0.166',
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
    };
}

function apiHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Referer: 'https://app-api.pixiv.net/',
        'User-Agent': 'PixivAndroidApp/5.0.166 (Android 6.0; Pixel C)',
        'App-OS': 'Android',
        'App-OS-Version': 'Android 6.0',
        'App-Version': '5.0.166',
        Accept: 'application/json'
    };
}

function webHeaders(cookie) {
    return {
        Cookie: cookie || '',
        Referer: `${WEB}/`,
        'User-Agent': WEB_UA,
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
    };
}

function imageUrl(url) {
    url = String(url || '');
    if (!url) return '';
    try {
        const match = url.match(/^https?:\/\/[^/]+(\/.*)$/i);
        if (match && /(?:i\.pximg\.net|i\.pixiv\.re)$/i.test(url.split('/')[2])) {
            return `${IMAGE_PROXY}${match[1]}`;
        }
    } catch (_) { /* keep the original URL */ }
    return url;
}

function firstImage(item) {
    const urls = item && (item.image_urls || item.urls || {});
    return imageUrl(urls.square_medium || urls.medium || urls.regular || urls.large || urls.original || item.url || '');
}

function cleanDescription(value) {
    return stripHtml(value || '').replace(/\s+/g, ' ').trim();
}

function tagNames(item) {
    const tags = item && item.tags;
    if (tags && !Array.isArray(tags) && Array.isArray(tags.tags)) return tagNames({ tags: tags.tags });
    if (!Array.isArray(tags)) return [];
    return tags.map(tag => typeof tag === 'string' ? tag : (tag && (tag.name || tag.tag || tag.translated_name || tag.translatedName)))
        .filter(Boolean).slice(0, 12);
}

function mapIllust(item) {
    if (!item) return null;
    const user = item.user || {};
    return {
        id: String(item.id || item.illustId || ''),
        name: item.title || item.illustTitle || '未命名作品',
        author: user.name || item.userName || '未知作者',
        description: cleanDescription(item.caption || item.description || item.illustComment || ''),
        cover: firstImage(item),
        tags: tagNames(item),
        pageCount: pageCount(item),
        totalView: Number(item.total_view || item.totalView || item.viewCount || 0),
        totalBookmarks: Number(item.total_bookmarks || item.totalBookmarks || item.bookmarkCount || 0),
        totalComments: Number(item.total_comments || item.totalComments || item.commentCount || 0),
        createdAt: item.create_date || item.createDate || ''
    };
}

function pageCount(detail) {
    return Number(detail.page_count || detail.pageCount || (detail.meta_pages && detail.meta_pages.length) ||
        (detail.pages && detail.pages.length) || (detail.mangaPages && detail.mangaPages.length) || 1);
}

function detailImages(detail) {
    const pageCandidates = [detail.meta_pages, detail.pages, detail.manga_pages, detail.mangaPages, detail.page_urls];
    const pages = pageCandidates.find(value => Array.isArray(value) && value.length) || [];
    if (Array.isArray(pages) && pages.length) {
        return pages.map(page => imageUrl(
            (page.image_urls && (page.image_urls.original || page.image_urls.large || page.image_urls.medium)) ||
            (page.urls && (page.urls.original || page.urls.regular || page.urls.large || page.urls.medium)) ||
            page.original_url || page.originalUrl || (typeof page === 'string' ? page : '')
        )).filter(Boolean);
    }
    const single = detail.meta_single_page && detail.meta_single_page.original_image_url;
    const urls = detail.image_urls || detail.urls || {};
    const one = single || urls.original || urls.large || urls.regular || urls.medium;
    return one ? [imageUrl(one)] : [];
}

function detailId(detail) {
    return String(detail && (detail.id || detail.illustId || detail.illust_id || '') || '');
}

function unwrapDetail(body) {
    return (body && body.illust) ||
        (body && body.body && (body.body.illust || body.body)) || body || {};
}

function webPageImages(body) {
    const root = body && body.body;
    const pages = Array.isArray(root) ? root :
        (root && (root.pages || root.mangaPages || root.illustPages || root.data || root.urls)) || [];
    return Array.isArray(pages) ? detailImages({ pages }) : [];
}

function comicFromDetail(detail, id, pageUrls) {
    const mapped = mapIllust(detail) || { id: String(id), name: `Pixiv ${id}`, author: '', description: '', cover: '' };
    const urls = pageUrls && pageUrls.length ? pageUrls : detailImages(detail);
    return {
        id: String(id), name: mapped.name, author: mapped.author, description: mapped.description,
        cover: mapped.cover, tags: mapped.tags || tagNames(detail), pageCount: urls.length || mapped.pageCount,
        totalView: mapped.totalView, totalBookmarks: mapped.totalBookmarks, totalComments: mapped.totalComments,
        createdAt: mapped.createdAt,
        chapters: [{ id: String(id), name: urls.length > 1 ? `正文（${urls.length}页）` : '正文' }]
    };
}

function listFromApi(body) {
    const items = (body.illusts || []).map(mapIllust).filter(item => item && item.id);
    return { items, hasNext: !!body.next_url, nextUrl: body.next_url || '' };
}

function listFromWeb(body) {
    const root = body && body.body;
    const data = root && (root.illustManga || root.illusts || root.thumbnails || root);
    let items = (data && (data.data || data.illusts || data.illust || data)) || [];
    if (!Array.isArray(items) && data && data.thumbnails) items = data.thumbnails.illust || [];
    const nextUrl = data && (data.nextUrl || data.next_url || root.nextUrl || root.next_url || '');
    return { items: Array.isArray(items) ? items.map(mapIllust).filter(item => item && item.id) : [], hasNext: !!nextUrl, nextUrl };
}

const source = {
    key: 'pixiv', name: 'Pixiv', token: '', refreshToken: '', cookie: '', recommendNextUrl: '',
    requiresLogin: true,
    get isLogged() { return !!(this.token || this.cookie); },

    async init() {
        this.token = (await storage._get('pixivAccessToken')) || '';
        this.refreshToken = (await storage._get('pixivRefreshToken')) || '';
        this.cookie = (await storage._get('pixivCookie')) || '';
        if (this.token) return;
        if (this.refreshToken) {
            try { await this.refresh(); } catch (_) { this.token = ''; }
        }
    },

    async oauthRequest(path, data) {
        const response = await http.request({
            url: `${OAUTH}${path}`, method: 'POST', headers: oauthHeaders(), data: formEncode(data), timeout: 20000
        });
        return jsonBody(response, 'Pixiv 登录');
    },

    async login(account, password) {
        const body = await this.oauthRequest('/auth/token', {
            client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'password',
            username: account, password, Device_token: 'pixiv', get_secure_url: 'true', include_policy: 'true'
        });
        if (!body.access_token) throw new Error(body.error_description || 'Pixiv 未返回 access token');
        this.token = body.access_token;
        this.refreshToken = body.refresh_token || '';
        this.cookie = '';
        await storage._set('pixivAccessToken', this.token);
        await storage._set('pixivRefreshToken', this.refreshToken);
        await storage._set('pixivCookie', '');
        return true;
    },

    async refresh() {
        if (!this.refreshToken) throw new Error('Pixiv refresh token 不存在');
        const body = await this.oauthRequest('/auth/token', {
            client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'refresh_token',
            refresh_token: this.refreshToken, include_policy: 'true'
        });
        if (!body.access_token) throw new Error(body.error_description || 'Pixiv token 已失效');
        this.token = body.access_token;
        this.refreshToken = body.refresh_token || this.refreshToken;
        await storage._set('pixivAccessToken', this.token);
        await storage._set('pixivRefreshToken', this.refreshToken);
        return true;
    },

    async importToken(value) {
        const text = String(value || '').trim();
        if (!text) throw new Error('请粘贴 access token、OAuth JSON 或 PHPSESSID cookie');
        let parsed = null;
        if (text[0] === '{') {
            try { parsed = JSON.parse(text); } catch (_) { throw new Error('OAuth JSON 格式不正确'); }
        }
        const access = (parsed && (parsed.access_token || parsed.accessToken || parsed.token)) ||
            (text.match(/(?:^|[?&\s])access_token=([^&\s;]+)/i) || [])[1] ||
            (text.match(/^Bearer\s+(.+)$/i) || [])[1] ||
            (/^[A-Za-z0-9._-]{20,}$/.test(text) ? text : '');
        const refresh = parsed && (parsed.refresh_token || parsed.refreshToken);
        const cookieMatch = text.match(/(?:^|;\s*)PHPSESSID=([^;]+)/i);
        if (access) {
            this.token = decodeURIComponent(String(access).replace(/["']/g, ''));
            this.refreshToken = refresh || '';
            this.cookie = '';
            await storage._set('pixivAccessToken', this.token);
            await storage._set('pixivRefreshToken', this.refreshToken);
            await storage._set('pixivCookie', '');
            return 'token';
        }
        if (cookieMatch) {
            // Preserve the complete browser cookie string: Pixiv may also use
            // p_ab_id and privacy flags when serving AJAX responses.
            this.cookie = text.replace(/^Cookie:\s*/i, '').trim();
            this.token = '';
            this.refreshToken = '';
            await storage._set('pixivCookie', this.cookie);
            await storage._set('pixivAccessToken', '');
            await storage._set('pixivRefreshToken', '');
            return 'cookie';
        }
        throw new Error('未识别到 access_token 或 PHPSESSID');
    },

    async importFile(path = '/userdisk/Favorite/pixiv-token.txt') {
        const value = await fs.readFile(path);
        return this.importToken(value);
    },

    ensureLogin() { if (!this.isLogged) throw new Error('请先登录 Pixiv，或导入 token/cookie'); },

    async apiGet(path, query, retried = false) {
        this.ensureLogin();
        const params = query || {};
        const suffix = Object.keys(params).filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
        try {
            const response = await http.request({
                url: `${API}${path}${suffix ? `?${suffix}` : ''}`, method: 'GET', headers: apiHeaders(this.token), timeout: 20000
            });
            return jsonBody(response, 'Pixiv API');
        } catch (error) {
            if (error.status === 401 && this.refreshToken && !retried) {
                await this.refresh();
                return this.apiGet(path, query, true);
            }
            throw error;
        }
    },

    async apiGetUrl(url) {
        const match = String(url || '').match(/^https?:\/\/[^/]+([^?]*)(?:\?(.*))?$/i);
        if (!match) throw new Error('Pixiv next_url format is invalid');
        const query = {};
        String(match[2] || '').split('&').forEach(part => {
            if (!part) return;
            const pair = part.split('=');
            const key = decodeURIComponent(pair.shift() || '');
            if (key) query[key] = decodeURIComponent(pair.join('=') || '');
        });
        return this.apiGet(match[1], query);
    },

    async webGet(path, query) {
        this.ensureLogin();
        const params = query || {};
        const suffix = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
        const response = await http.request({
            url: `${WEB}${path}${suffix ? `?${suffix}` : ''}`, method: 'GET',
            headers: webHeaders(this.cookie), timeout: 20000
        });
        return jsonBody(response, 'Pixiv 网页接口');
    },

    async detailData(id) {
        const body = this.token
            ? await this.apiGet('/v1/illust/detail', { illust_id: id, filter: 'for_android' })
            : await this.webGet(`/ajax/illust/${encodeURIComponent(id)}`);
        const detail = unwrapDetail(body);
        if (!detailId(detail)) throw new Error('Pixiv artwork is unavailable or access was denied');

        let urls = detailImages(detail);
        const expected = pageCount(detail);
        if (!this.token) {
            try {
                const pagesBody = await this.webGet(`/ajax/illust/${encodeURIComponent(id)}/pages`, { lang: 'en' });
                const pageUrls = webPageImages(pagesBody);
                if (pageUrls.length) urls = pageUrls;
            } catch (_) { /* The detail response remains usable for single-page works. */ }
        }
        // Some Pixiv-compatible endpoints omit meta_pages but retain a p0 URL.
        if (urls.length > 0 && urls.length < expected) {
            const match = urls[0].match(/([_-])p0(?=[_.])/i);
            if (match) {
                const base = urls[0];
                const generated = [];
                for (let i = 0; i < expected; i++) {
                    generated.push(imageUrl(base.replace(/([_-])p0(?=[_.])/i, `$1p${i}`)));
                }
                urls = generated;
            }
        }
        return { detail, urls };
    },

    async search(keyword, page = 1) {
        this.ensureLogin();
        let list;
        if (this.token) {
            const body = await this.apiGet('/v1/search/illust', {
                word: keyword.trim(), filter: 'for_android', merge_plain_keyword_results: 'true',
                search_target: 'partial_match_for_tags', sort: 'date_desc', offset: (page - 1) * 30
            });
            list = listFromApi(body);
        } else {
            const body = await this.webGet(`/ajax/search/artworks/${encodeURIComponent(keyword.trim())}`, {
                word: keyword.trim(), order: 'date_d', mode: 'all', p: page, s_mode: 's_tag_full', type: 'all'
            });
            list = listFromWeb(body);
        }
        return { items: list.items, total: list.hasNext ? page * 30 + 1 : (page - 1) * 30 + list.items.length };
    },

    async comic(id) {
        this.ensureLogin();
        const data = await this.detailData(id);
        const detail = data.detail;
        if (!detail.id && detail.illustId) detail.id = detail.illustId;
        if (!detail || !detail.id) throw new Error('Pixiv 作品不存在或无权访问');
        return comicFromDetail(detail, id, data.urls);
    },

    async chapter(id) {
        this.ensureLogin();
        const data = await this.detailData(id);
        const detail = data.detail;
        const urls = data.urls;
        if (!urls.length) throw new Error('Pixiv 作品没有可用图片');
        return urls;
    },

    async recommend(page = 1) {
        this.ensureLogin();
        let list;
        if (this.token) {
            let body;
            if (page > 1 && this.recommendNextUrl) body = await this.apiGetUrl(this.recommendNextUrl);
            else body = await this.apiGet('/v1/illust/recommended', { filter: 'for_ios', include_ranking_label: 'true' });
            list = listFromApi(body);
            this.recommendNextUrl = list.nextUrl;
        } else {
            const body = await this.webGet('/ajax/top/illust', { mode: 'all', p: page });
            list = listFromWeb(body);
        }
        return { items: list.items, total: list.hasNext ? page * 30 + 1 : (page - 1) * 30 + list.items.length };
    },

    imageHeaders: { Referer: 'https://app-api.pixiv.net/', 'User-Agent': WEB_UA },
    async cacheChapter(id, progress) {
        return cacheUrls(this.key, String(id).slice(0, 80), await this.chapter(id), this.imageHeaders, progress);
    }
};

export default source;
