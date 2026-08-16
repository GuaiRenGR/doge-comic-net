<template>
    <div class="container">
        <ButtonColumn>
            <IconButton :icon="require('../../assets/back.png?base64')" @click="back" />
        </ButtonColumn>
        <scroller style="flex: 1;" over-scroll="50px" over-fling="50px" show-scrollbar="false">
            <text class="title">联网漫画</text>
            <div class="source-tabs">
                <div class="source-tab" :class="{ 'source-active': item.key === sourceKey }"
                    v-for="item in sources" :key="item.key" @click="selectSource(item.key)">
                    <text class="source-text">{{ item.name }}</text>
                </div>
            </div>
            <div class="search-row">
                <div class="search-input" @click="activeInput = 'keyword'">
                    <text v-if="keyword" class="search-value">{{ keyword }}</text>
                    <text v-else class="search-placeholder">{{ sourceKey === 'pixiv' ? '作品名、作者或标签' : '漫画名、作者或 JM 号' }}</text>
                </div>
                <div class="action primary" @click="search(true)"><text class="action-text">搜索</text></div>
            </div>
            <div v-if="activeSource.requiresLogin && !activeSource.isLogged" class="login-panel">
                <div class="login-field" @click="activeInput = 'account'">
                    <text v-if="account" class="search-value">{{ account }}</text><text v-else class="search-placeholder">{{ activeSource.key === 'pixiv' ? 'Pixiv账号' : '哔咔邮箱' }}</text>
                </div>
                <div class="login-field" @click="activeInput = 'password'">
                    <text v-if="password" class="search-value">{{ passwordMask }}</text><text v-else class="search-placeholder">{{ activeSource.key === 'pixiv' ? 'Pixiv密码' : '哔咔密码' }}</text>
                </div>
                <div class="action primary" @click="loginSource"><text class="action-text">登录</text></div>
            </div>
            <div v-if="activeSource.key === 'pixiv' && !activeSource.isLogged" class="token-panel">
                <div class="login-field token-field" @click="activeInput = 'tokenText'">
                    <text v-if="tokenText" class="search-value">{{ tokenMask }}</text>
                    <text v-else class="search-placeholder">粘贴 token 或 PHPSESSID</text>
                </div>
                <div class="action" @click="importPixivToken"><text class="action-text">导入令牌</text></div>
                <div class="action" @click="importPixivTokenFile"><text class="action-text">读取文件</text></div>
            </div>
            <div class="keyboard">
                <div class="key-row" v-for="(row, rowIndex) in keyboard" :key="rowIndex">
                    <div class="key" v-for="key in row" :key="key" @click="appendKey(key)"><text class="key-text">{{ displayKey(key) }}</text></div>
                </div>
                <div class="key-row">
                    <div class="key key-command" @click="backspace"><text class="key-text">退格</text></div>
                    <div class="key key-command" @click="keyboardUppercase = !keyboardUppercase"><text class="key-text">大小写</text></div>
                    <div class="key key-space" @click="appendKey(' ')"><text class="key-text">空格</text></div>
                    <div class="key key-command" @click="clearKeyword"><text class="key-text">清空</text></div>
                </div>
            </div>
            <div v-if="hotTags.length" class="hot-tags">
                <div class="hot-tag" v-for="tag in hotTags" :key="tag" @click="useTag(tag)"><text class="hot-tag-text">{{ tag }}</text></div>
            </div>
            <text v-if="message" class="status">{{ message }}</text>

            <div v-if="comic" class="detail" :class="{ 'pixiv-detail': sourceKey === 'pixiv' }">
                <image :resize="sourceKey === 'pixiv' ? 'contain' : 'cover'"
                    class="detail-cover" :class="{ 'pixiv-detail-cover': sourceKey === 'pixiv' }" :src="comic.cover" />
                <div class="detail-body" :class="{ 'pixiv-detail-body': sourceKey === 'pixiv' }">
                    <text class="comic-title">{{ comic.name }}</text>
                    <text class="meta">{{ activeSource.name }} #{{ comic.id }} · {{ comic.author }}</text>
                    <text v-if="sourceKey === 'pixiv'" class="detail-section-title">作品简介</text>
                    <text v-if="comic.description" class="description">{{ comic.description }}</text>
                    <text v-else class="description empty-description">暂无简介</text>
                    <div v-if="sourceKey === 'pixiv'" class="pixiv-detail-info">
                        <text v-if="comic.tags && comic.tags.length" class="pixiv-tags" lines="2" text-overflow="ellipsis">标签：{{ comic.tags.join(' · ') }}</text>
                        <text class="pixiv-stats">{{ comic.pageCount || 1 }} 页 · 浏览 {{ comic.totalView || 0 }} · 收藏 {{ comic.totalBookmarks || 0 }}</text>
                    </div>
                    <div class="detail-actions">
                        <div class="action detail-action primary" @click="readChapter(comic.chapters[0])"><text class="action-text">开始阅读</text></div>
                        <div class="action detail-action" @click="downloadComic"><text class="action-text">下载全部</text></div>
                        <div class="action detail-action" @click="comic = null"><text class="action-text">返回结果</text></div>
                    </div>
                </div>
                <div class="chapters">
                    <div class="chapter" v-for="(chapter, index) in comic.chapters" :key="chapter.id"
                        @click="readChapter(chapter)">
                        <text class="chapter-index">{{ index + 1 }}</text><text class="chapter-name">{{ chapter.name }}</text>
                    </div>
                </div>
            </div>

            <div v-else-if="sourceKey === 'pixiv'" class="pixiv-results">
                <div class="pixiv-result" v-for="item in results" :key="item.id" @click="openComic(item.id)">
                    <div class="pixiv-cover-box">
                        <image resize="contain" class="pixiv-cover" :src="item.cover" />
                    </div>
                    <text class="pixiv-title" lines="2" text-overflow="ellipsis">{{ item.name }}</text>
                    <text class="pixiv-author" lines="1" text-overflow="ellipsis">{{ item.author }}</text>
                    <text class="pixiv-meta">{{ item.pageCount || 1 }} 页 · 收藏 {{ item.totalBookmarks || 0 }}</text>
                    <text v-if="item.description" class="pixiv-summary" lines="2" text-overflow="ellipsis">{{ item.description }}</text>
                </div>
                <div v-if="hasMore && results.length" class="action more" @click="search(false)"><text class="action-text">加载更多</text></div>
            </div>
            <div v-else class="results">
                <div class="result" v-for="item in results" :key="item.id" @click="openComic(item.id)">
                    <image resize="cover" class="cover" :src="item.cover" />
                    <div class="result-text">
                        <text class="comic-title">{{ item.name }}</text>
                        <text class="meta">{{ activeSource.name }} #{{ item.id }} · {{ item.author }}</text>
                        <text class="description">{{ item.description }}</text>
                    </div>
                </div>
                <div v-if="hasMore && results.length" class="action more" @click="search(false)"><text class="action-text">加载更多</text></div>
            </div>
        </scroller>
    </div>
</template>

<script>
import ButtonColumn from '../../components/button-column.vue';
import IconButton from '../../components/icon-button.vue';
import sources, { findSource } from '../../utils/ComicSources';

export default {
    name: 'network',
    components: { ButtonColumn, IconButton },
    data() {
        return {
            sources, sourceKey: 'jm', keyword: '', account: '', password: '', tokenText: '', activeInput: 'keyword', keyboardUppercase: false,
            results: [], comic: null, page: 1, total: 0, busy: false, message: '', hotTags: [], recommendMode: false,
            keyboard: [
                ['1','2','3','4','5','6','7','8','9','0'],
                ['Q','W','E','R','T','Y','U','I','O','P'],
                ['A','S','D','F','G','H','J','K','L'],
                ['Z','X','C','V','B','N','M','@','.','_','-','!'],
                ['=',';','+','/','?',':','{','}','"',',']
            ]
        };
    },
    async created() {
        const options = this.$page.options || {};
        if (options.source && findSource(options.source)) this.sourceKey = options.source;
        for (let i = 0; i < this.sources.length; i++) {
            if (this.sources[i].init) await this.sources[i].init();
        }
        await this.loadHotTags();
        this.recommendMode = options.recommend === '1' || options.recommend === 1 || options.recommend === true;
        if (this.recommendMode && this.sourceKey === 'pixiv') {
            if (this.activeSource.isLogged) await this.loadRecommend(true);
            else this.message = '请先登录 Pixiv，登录成功后会自动加载推荐';
        }
    },
    computed: {
        hasMore() { return this.results.length < this.total; },
        activeSource() { return findSource(this.sourceKey); },
        passwordMask() { return '*'.repeat(this.password.length); },
        tokenMask() {
            if (this.tokenText.length < 12) return '*'.repeat(this.tokenText.length);
            return `${this.tokenText.slice(0, 6)}…${this.tokenText.slice(-6)}`;
        }
    },
    methods: {
        back() { this.$page.finish(); },
        displayKey(key) { return /^[A-Z]$/.test(key) && !this.keyboardUppercase ? key.toLowerCase() : key; },
        appendKey(key) {
            const field = this.activeInput;
            if (/^[A-Z]$/.test(key) && !this.keyboardUppercase) key = key.toLowerCase();
            const limit = field === 'tokenText' ? 2048 : 80;
            if (this[field].length < limit) this[field] += key;
        },
        backspace() { this[this.activeInput] = this[this.activeInput].slice(0, -1); },
        clearKeyword() { this[this.activeInput] = ''; },
        useTag(tag) { this.keyword = tag; this.search(true); },
        async loadHotTags() {
            this.hotTags = [];
            if (!this.activeSource.hotTags) return;
            try { this.hotTags = (await this.activeSource.hotTags()).slice(0, 12); } catch (_) { this.hotTags = []; }
        },
        selectSource(key) {
            if (this.busy || key === this.sourceKey) return;
            this.sourceKey = key; this.results = []; this.comic = null; this.page = 1; this.total = 0;
            this.message = ''; this.activeInput = ['picacg', 'pixiv'].indexOf(key) >= 0 ? 'account' : 'keyword'; this.loadHotTags();
        },
        async loginSource() {
            if (this.busy || !this.account || !this.password) return;
            this.busy = true; this.message = `正在登录${this.activeSource.name}…`;
            try { await this.activeSource.login(this.account, this.password); this.message = `${this.activeSource.name}登录成功`; this.activeInput = 'keyword'; }
            catch (error) { this.message = `登录失败：${error.message || error}`; }
            this.busy = false;
            if (this.recommendMode && this.sourceKey === 'pixiv' && this.activeSource.isLogged) await this.loadRecommend(true);
        },
        async importPixivToken() {
            if (this.busy || !this.tokenText) return;
            this.busy = true; this.message = '正在导入 Pixiv 令牌…';
            try {
                const mode = await this.activeSource.importToken(this.tokenText);
                this.message = mode === 'cookie' ? 'Pixiv cookie 导入成功' : 'Pixiv token 导入成功';
                this.tokenText = ''; this.activeInput = 'keyword';
            } catch (error) { this.message = `导入失败：${error.message || error}`; }
            this.busy = false;
            if (this.recommendMode && this.sourceKey === 'pixiv' && this.activeSource.isLogged) await this.loadRecommend(true);
        },
        async importPixivTokenFile() {
            if (this.busy) return;
            this.busy = true; this.message = '正在读取 /userdisk/Favorite/pixiv-token.txt…';
            try {
                const mode = await this.activeSource.importFile();
                this.message = mode === 'cookie' ? 'Pixiv cookie 导入成功' : 'Pixiv token 导入成功';
                this.activeInput = 'keyword';
            } catch (error) { this.message = `读取失败：${error.message || error}`; }
            this.busy = false;
            if (this.recommendMode && this.sourceKey === 'pixiv' && this.activeSource.isLogged) await this.loadRecommend(true);
        },
        async search(reset) {
            if (this.busy || !this.keyword.trim()) return;
            this.busy = true; this.message = `正在连接${this.activeSource.name}…`;
            if (reset) { this.page = 1; this.results = []; this.comic = null; }
            try {
                const data = await this.activeSource.search(this.keyword, this.page);
                this.results = this.results.concat(data.items); this.total = data.total; this.page++;
                this.message = this.results.length ? `共找到 ${this.total} 部漫画` : '没有找到相关漫画';
            } catch (error) { this.message = error.message || String(error); }
            this.busy = false;
        },
        async loadRecommend(reset = true) {
            if (this.busy || !this.activeSource.recommend) return;
            this.busy = true; this.message = `正在加载${this.activeSource.name}推荐…`;
            if (reset) { this.page = 1; this.results = []; this.comic = null; }
            try {
                const data = await this.activeSource.recommend(this.page);
                this.results = this.results.concat(data.items); this.total = data.total; this.page++;
                this.message = this.results.length ? `推荐作品 ${this.results.length} 部` : '暂时没有推荐作品';
            } catch (error) { this.message = error.message || String(error); }
            this.busy = false;
        },
        async openComic(id) {
            if (this.busy) return;
            this.busy = true; this.message = '正在读取漫画信息…';
            try { this.comic = await this.activeSource.comic(id); this.message = ''; }
            catch (error) { this.message = error.message || String(error); }
            this.busy = false;
        },
        async readChapter(chapter) {
            if (this.busy) return;
            this.busy = true; this.message = `正在加载「${chapter.name}」…`;
            try {
                const urls = await this.activeSource.cacheChapter(chapter.id, (done, total) => {
                    this.message = `正在缓存正文 ${done}/${total}`;
                });
                const node = {
                    type: 'network', path: `${this.sourceKey}:${this.comic.id}/${chapter.id}`, urls,
                    name: this.comic.name, cover: this.comic.cover
                };
                $falcon.navTo('reader', { node: JSON.stringify(node) }); this.message = '';
            } catch (error) { this.message = error.message || String(error); }
            this.busy = false;
        },
        async downloadComic() {
            if (this.busy) return;
            this.busy = true; this.message = '正在准备下载…';
            try {
                const path = await this.activeSource.download(this.comic, (done, total) => { this.message = `下载中 ${done}/${total}`; });
                this.message = `下载完成：${path}`;
            } catch (error) { this.message = `下载失败：${error.message || error}`; }
            this.busy = false;
        }
    }
};
</script>

<style lang="less" scoped>
@import "../../styles/common.less";
@import "../../styles/md-color.less";
.search-row, .detail-actions { width: 95%; flex-direction: row; align-items: center; }
.source-tabs { width: 95%; margin-bottom: 5vh; flex-direction: row; flex-wrap: wrap; }
.source-tab { height: 19vh; margin: 0 3vh 3vh 0; padding: 0 6vh; border-radius: 4vh; background-color: @neutral; justify-content: center; }
.source-active { background-color: @primary; }
.source-text { color: @on-neutral; font-size: 7vh; }
.search-input { flex: 1; height: 24vh; padding: 0 5vh; border-radius: 6vh; background-color: @neutral; color: @on-neutral; font-size: 9vh; }
.search-input { justify-content: center; }
.search-value { color: @on-neutral; font-size: 9vh; }
.search-placeholder { color: @outline; font-size: 8vh; }
.action { min-width: 38vh; height: 24vh; margin-left: 5vh; padding: 0 7vh; border-radius: 6vh; background-color: @neutral; justify-content: center; align-items: center; }
.action:active, .result:active, .chapter:active { opacity: .6; }
.primary { background-color: @primary; }
.action-text { color: @on-neutral; font-size: 8vh; }
.status { margin: 7vh 0; color: @outline; font-size: 7vh; }
.login-panel { width: 95%; margin-top: 4vh; flex-direction: row; align-items: center; }
.token-panel { width: 95%; margin-top: 3vh; flex-direction: row; align-items: center; }
.login-field { flex: 1; height: 22vh; margin-right: 3vh; padding: 0 4vh; border-radius: 5vh; background-color: @neutral; justify-content: center; }
.token-field { margin-right: 0; }
.keyboard { width: 95%; margin-top: 4vh; }
.key-row { width: 100%; height: 17vh; margin-bottom: 2vh; flex-direction: row; }
.key { flex: 1; height: 17vh; margin: 0 1vh; border-radius: 3vh; background-color: @neutral; justify-content: center; align-items: center; }
.key:active, .hot-tag:active { opacity: .6; }
.key-text { color: @on-neutral; font-size: 7vh; }
.key-command { flex: 2; }
.key-space { flex: 5; }
.hot-tags { width: 95%; margin-top: 4vh; flex-direction: row; flex-wrap: wrap; }
.hot-tag { height: 17vh; margin: 0 3vh 3vh 0; padding: 0 5vh; border-radius: 4vh; background-color: @secondary; justify-content: center; }
.hot-tag-text { color: @on-secondary; font-size: 6vh; }
.results { margin-bottom: 10vh; }
.result { width: 90%; min-height: 55vh; padding: 5vh; margin-bottom: 5vh; border-radius: 6vh; background-color: @neutral; flex-direction: row; }
.cover { width: 32vh; height: 45vh; border-radius: 4vh; }
.result-text { flex: 1; margin-left: 6vh; }
.comic-title { color: @on-neutral; font-size: 10vh; line-height: 13vh; }
.meta { margin-top: 2vh; color: @outline; font-size: 7vh; }
.description { margin-top: 4vh; color: @on-neutral; font-size: 7vh; line-height: 10vh; }
.empty-description { color: @outline; }
.more { margin-left: 0; width: 50vh; }
.pixiv-results { margin-bottom: 10vh; flex-direction: row; flex-wrap: wrap; align-items: flex-start; }
.pixiv-result { width: 48vh; min-height: 86vh; margin: 0 4vh 6vh 0; padding: 3vh; border-radius: 4vh; background-color: @neutral; }
.pixiv-result:active { opacity: .6; }
.pixiv-cover-box { width: 48vh; height: 56vh; border-radius: 3vh; background-color: @surface; justify-content: center; align-items: center; }
.pixiv-cover { width: 48vh; height: 56vh; border-radius: 3vh; }
.pixiv-title { margin-top: 3vh; color: @on-neutral; font-size: 7vh; line-height: 9vh; }
.pixiv-author { margin-top: 1vh; color: @outline; font-size: 5.5vh; line-height: 7vh; }
.pixiv-meta { margin-top: 1vh; color: @outline; font-size: 5.5vh; line-height: 7vh; }
.pixiv-summary { margin-top: 2vh; color: @on-neutral; font-size: 5.5vh; line-height: 7vh; }
.detail { width: 95%; flex-direction: row; flex-wrap: wrap; }
.detail-cover { width: 45vh; height: 63vh; border-radius: 5vh; }
.detail-body { width: 95vh; margin-left: 7vh; }
.pixiv-detail-cover { width: 52vh; height: 68vh; }
.pixiv-detail-body { width: 125vh; }
.detail-section-title { margin-top: 4vh; color: @outline; font-size: 6vh; line-height: 8vh; }
.pixiv-detail-info { margin-top: 3vh; }
.pixiv-tags { color: @outline; font-size: 5.5vh; line-height: 7vh; }
.pixiv-stats { margin-top: 1vh; color: @outline; font-size: 5.5vh; line-height: 7vh; }
.detail-actions { margin-top: 7vh; }
.detail-action { margin-left: 0; margin-right: 4vh; }
.chapters { width: 100%; margin-top: 8vh; }
.chapter { height: 24vh; margin-bottom: 3vh; padding: 0 6vh; border-radius: 5vh; background-color: @neutral; flex-direction: row; align-items: center; }
.chapter-index { width: 15vh; color: @outline; font-size: 7vh; }
.chapter-name { color: @on-neutral; font-size: 8vh; }
</style>
