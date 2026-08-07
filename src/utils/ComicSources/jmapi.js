import http from 'http';
import { cacheUrls } from './helpers';

const BASE = 'https://jmcomic.stng.asia';

function normalizeId(value) {
    return String(value || '').replace(/^jm/i, '').trim();
}

function unwrapBody(response, label) {
    const status = response && (response.status || response.statusCode);
    let body = response && response.body;
    if (typeof body === 'string') {
        const text = body.trim();
        if (text[0] === '<') throw new Error(`${label}返回了 HTML 页面`);
        try { body = JSON.parse(text); }
        catch (_) { throw new Error(`${label}返回的数据不是 JSON`); }
    }
    if (status && (status < 200 || status >= 400)) {
        throw new Error((body && (body.message || body.error)) || `${label} HTTP ${status}`);
    }
    if (!body || typeof body !== 'object') throw new Error(`${label}返回了空数据`);
    if (body.code && Number(body.code) >= 400) throw new Error(body.message || `${label}失败`);
    return body;
}

async function request(path, label) {
    const response = await http.request({
        url: `${BASE}${path}`, method: 'GET',
        headers: { Accept: 'application/json' }, timeout: 20000
    });
    return unwrapBody(response, label);
}

function chapterId(albumId, chapter) {
    return JSON.stringify({ albumId: normalizeId(albumId), chapter: Number(chapter) || 1 });
}

const source = {
    key: 'jmapi',
    name: '禁漫 API',

    async search(keyword, page = 1) {
        const directId = /^(?:jm)?\d+$/i.test(keyword.trim()) ? normalizeId(keyword) : '';
        if (directId) {
            const comic = await this.comic(directId);
            return {
                items: [{
                    id: comic.id, name: comic.name, author: comic.author,
                    description: comic.description, cover: comic.cover
                }],
                total: 1
            };
        }

        const data = await request(`/search/${encodeURIComponent(keyword.trim())}/${page}`, '禁漫 API 搜索');
        const results = Array.isArray(data.results) ? data.results : [];
        return {
            items: results.map(item => ({
                id: String(item.comic_id),
                name: item.title || `JM${item.comic_id}`,
                author: '禁漫',
                description: item.pages ? `${item.pages} 页` : '',
                cover: item.cover_url || `${BASE}/album/${item.comic_id}/cover`
            })),
            total: data.has_more ? page * 10 + 1 : (page - 1) * 10 + results.length
        };
    },

    async comic(id) {
        id = normalizeId(id);
        const data = await request(`/album/${encodeURIComponent(id)}`, '禁漫 API 详情');
        const chapterCount = Math.max(1, Number(data.total_chapters) || 1);
        const chapters = [];
        for (let i = 1; i <= chapterCount; i++) {
            chapters.push({ id: chapterId(id, i), name: chapterCount === 1 ? '正文' : `第 ${i} 话` });
        }
        const tags = Array.isArray(data.tags) ? data.tags : [];
        const details = [];
        if (data.page_count) details.push(`${data.page_count} 页`);
        if (data.views) details.push(`${data.views} 次浏览`);
        if (tags.length) details.push(tags.join(' / '));
        return {
            id,
            name: data.name || `JM${id}`,
            author: '禁漫',
            description: details.join(' · '),
            tags,
            cover: data.cover || `${BASE}/album/${id}/cover`,
            chapters
        };
    },

    async chapter(id) {
        let info;
        try { info = JSON.parse(id); }
        catch (_) { info = { albumId: normalizeId(id), chapter: 1 }; }
        const albumId = normalizeId(info.albumId);
        const chapter = Number(info.chapter) || 1;
        const data = await request(
            `/photo/${encodeURIComponent(albumId)}/chapter/${chapter}`,
            '禁漫 API 正文'
        );
        const images = Array.isArray(data.images) ? data.images : [];
        const urls = images.map(item => typeof item === 'string' ? item : item.url).filter(Boolean);
        if (!urls.length) throw new Error('禁漫 API 正文没有图片');
        return urls;
    },

    async cacheChapter(id, progress) {
        const urls = await this.chapter(id);
        return cacheUrls(this.key, id, urls, null, progress);
    }
};

export default source;
