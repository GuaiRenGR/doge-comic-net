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
                    <text v-else class="search-placeholder">漫画名、作者或 JM 号</text>
                </div>
                <div class="action primary" @click="search(true)"><text class="action-text">搜索</text></div>
            </div>
            <div v-if="activeSource.requiresLogin && !activeSource.isLogged" class="login-panel">
                <div class="login-field" @click="activeInput = 'account'">
                    <text v-if="account" class="search-value">{{ account }}</text><text v-else class="search-placeholder">哔咔邮箱</text>
                </div>
                <div class="login-field" @click="activeInput = 'password'">
                    <text v-if="password" class="search-value">{{ passwordMask }}</text><text v-else class="search-placeholder">哔咔密码</text>
                </div>
                <div class="action primary" @click="loginPicacg"><text class="action-text">登录</text></div>
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

            <div v-if="comic" class="detail">
                <image resize="cover" class="detail-cover" :src="comic.cover" />
                <div class="detail-body">
                    <text class="comic-title">{{ comic.name }}</text>
                    <text class="meta">JM{{ comic.id }} · {{ comic.author }}</text>
                    <text class="description">{{ comic.description }}</text>
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

            <div v-else class="results">
                <div class="result" v-for="item in results" :key="item.id" @click="openComic(item.id)">
                    <image resize="cover" class="cover" :src="item.cover" />
                    <div class="result-text">
                        <text class="comic-title">{{ item.name }}</text>
                        <text class="meta">JM{{ item.id }} · {{ item.author }}</text>
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
            sources, sourceKey: 'jm', keyword: '', account: '', password: '', activeInput: 'keyword', keyboardUppercase: false,
            results: [], comic: null, page: 1, total: 0, busy: false, message: '', hotTags: [],
            keyboard: [
                ['1','2','3','4','5','6','7','8','9','0'],
                ['Q','W','E','R','T','Y','U','I','O','P'],
                ['A','S','D','F','G','H','J','K','L'],
                ['Z','X','C','V','B','N','M','@','.','_','-','!']
            ]
        };
    },
    async created() {
        for (let i = 0; i < this.sources.length; i++) {
            if (this.sources[i].init) await this.sources[i].init();
        }
        await this.loadHotTags();
    },
    computed: {
        hasMore() { return this.results.length < this.total; },
        activeSource() { return findSource(this.sourceKey); },
        passwordMask() { return '*'.repeat(this.password.length); }
    },
    methods: {
        back() { this.$page.finish(); },
        displayKey(key) { return /^[A-Z]$/.test(key) && !this.keyboardUppercase ? key.toLowerCase() : key; },
        appendKey(key) {
            const field = this.activeInput;
            if (/^[A-Z]$/.test(key) && !this.keyboardUppercase) key = key.toLowerCase();
            if (this[field].length < 80) this[field] += key;
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
            this.message = ''; this.activeInput = key === 'picacg' ? 'account' : 'keyword'; this.loadHotTags();
        },
        async loginPicacg() {
            if (this.busy || !this.account || !this.password) return;
            this.busy = true; this.message = '正在登录哔咔…';
            try { await this.activeSource.login(this.account, this.password); this.message = '哔咔登录成功'; this.activeInput = 'keyword'; }
            catch (error) { this.message = `登录失败：${error.message || error}`; }
            this.busy = false;
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
.login-field { flex: 1; height: 22vh; margin-right: 3vh; padding: 0 4vh; border-radius: 5vh; background-color: @neutral; justify-content: center; }
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
.more { margin-left: 0; width: 50vh; }
.detail { width: 95%; flex-direction: row; flex-wrap: wrap; }
.detail-cover { width: 45vh; height: 63vh; border-radius: 5vh; }
.detail-body { width: 95vh; margin-left: 7vh; }
.detail-actions { margin-top: 7vh; }
.detail-action { margin-left: 0; margin-right: 4vh; }
.chapters { width: 100%; margin-top: 8vh; }
.chapter { height: 24vh; margin-bottom: 3vh; padding: 0 6vh; border-radius: 5vh; background-color: @neutral; flex-direction: row; align-items: center; }
.chapter-index { width: 15vh; color: @outline; font-size: 7vh; }
.chapter-name { color: @on-neutral; font-size: 8vh; }
</style>
