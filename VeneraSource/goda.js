/** @type {import('./_venera_.js')} */
class Goda extends ComicSource {

    name = "GoDa漫画"

    key = "goda"

    version = "1.0.2"

    minAppVersion = "1.4.0"

    url = "https://gitlab.com/Canaan-HS/database/-/raw/main/VeneraSource/goda.js"

    settings = {
        domains: {
            title: "域名",
            type: "input",
            default: "godamh.com"
        },
        api: {
            title: "API域名",
            type: "input",
            default: "v2.apikk.top"
        },
        image: {
            title: "图片域名",
            type: "input",
            default: "f40-1-4.g-mh.online"
        }
    }

    get baseUrl() {
        return `https://${this.loadSetting("domains")}`;
    }

    get apiUrl() {
        return `https://${this.loadSetting("api")}/api/v2`;
    }

    get imageUrl() {
        return `https://${this.loadSetting("image")}`;
    }

    get headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
            "Referer": this.baseUrl
        };
    }

    parseComics(doc) {
        console.warn(doc)
        const result = [];
        for (let item of doc.querySelectorAll(".pb-2")) {
            result.push(new Comic({
                id: item.querySelector("a").attributes["href"],
                title: item.querySelector("h3").text,
                cover: item.querySelector("img").attributes["src"]
            }))
        }
        return result;
    }

    // explore page list
    explore = [
        {
            // title of the page.
            // title is used to identify the page, it should be unique
            title: this.name,

            /// multiPartPage or multiPageComicList or mixed
            type: "multiPartPage",

            load: async () => {
                const res = await Network.get(this.baseUrl, this.headers);
                const document = new HtmlDocument(res.body);
                const result = [{ title: "近期更新", comics: [], viewMore: null }];
                for (let item of document.querySelector(".pb-unit-md").querySelectorAll(".slicarda")) {
                    result[0].comics.push(new Comic({
                        id: item.attributes["href"],
                        title: item.querySelector("h3").text,
                        cover: item.querySelector("img").attributes["src"]
                    }))
                }
                const cardlists = document.querySelectorAll(".cardlist");
                const hometitles = document.querySelectorAll(".hometitle");
                for (let i = 0; i < hometitles.length; i++) {
                    result.push({
                        title: hometitles[i].querySelector("h2").text,
                        comics: this.parseComics(cardlists[i]),
                        viewMore: {
                            page: "category",
                            attributes: {
                                category: hometitles[i].querySelector("h2").text,
                                param: hometitles[i].attributes["href"]
                            },
                        }
                    });
                }
                return result;
            }
        }
    ]

    // categories
    category = {
        /// title of the category page, used to identify the page, it should be unique
        title: this.name,
        parts: [
            {
                name: "类型",
                type: "fixed",
                categories: [
                    "全部",
                    "韩漫",
                    "热门漫画",
                    "国漫",
                    "其他",
                    "日漫",
                    "欧美"
                ],
                itemType: "category",
                categoryParams: [
                    "/manga",
                    "/manga-genre/kr",
                    "/manga-genre/hots",
                    "/manga-genre/cn",
                    "/manga-genre/qita",
                    "/manga-genre/jp",
                    "/manga-genre/ou-mei"
                ],
            },
            {
                name: "标签",
                type: "fixed",
                categories: [
                    "复仇",
                    "古风",
                    "奇幻",
                    "逆袭",
                    "异能",
                    "宅向",
                    "穿越",
                    "热血",
                    "纯爱",
                    "系统",
                    "重生",
                    "冒险",
                    "灵异",
                    "大女主",
                    "剧情",
                    "恋爱",
                    "玄幻",
                    "女神",
                    "科幻",
                    "魔幻",
                    "推理",
                    "猎奇",
                    "治愈",
                    "都市",
                    "异形",
                    "青春",
                    "末日",
                    "悬疑",
                    "修仙",
                    "战斗"
                ],
                itemType: "category",
                categoryParams: [
                    "/manga-tag/fuchou",
                    "/manga-tag/gufeng",
                    "/manga-tag/qihuan",
                    "/manga-tag/nixi",
                    "/manga-tag/yineng",
                    "/manga-tag/zhaixiang",
                    "/manga-tag/chuanyue",
                    "/manga-tag/rexue",
                    "/manga-tag/chunai",
                    "/manga-tag/xitong",
                    "/manga-tag/zhongsheng",
                    "/manga-tag/maoxian",
                    "/manga-tag/lingyi",
                    "/manga-tag/danvzhu",
                    "/manga-tag/juqing",
                    "/manga-tag/lianai",
                    "/manga-tag/xuanhuan",
                    "/manga-tag/nvshen",
                    "/manga-tag/kehuan",
                    "/manga-tag/mohuan",
                    "/manga-tag/tuili",
                    "/manga-tag/lieqi",
                    "/manga-tag/zhiyu",
                    "/manga-tag/doushi",
                    "/manga-tag/yixing",
                    "/manga-tag/qingchun",
                    "/manga-tag/mori",
                    "/manga-tag/xuanyi",
                    "/manga-tag/xiuxian",
                    "/manga-tag/zhandou"
                ],
            }
        ],
        // enable ranking page
        enableRankingPage: false,
    }

    /// category comic loading related
    categoryComics = {
        load: async (category, params, options, page) => {
            const res = await Network.get(`${this.baseUrl}${params}/page/${page}`, this.headers);
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }
            const document = new HtmlDocument(res.body);
            let maxPage = null;
            try {
                maxPage = parseInt(document.querySelectorAll("button.text-small").pop().text.replaceAll("\n", "").replaceAll(" ", ""));
            } catch (_) {
                maxPage = 1;
            }
            return {
                comics: this.parseComics(document),
                maxPage: maxPage
            };
        }
    }

    /// search related
    search = {
        load: async (keyword, options, page) => {
            const res = await Network.get(`${this.baseUrl}/s/${keyword}?page=${page}`);
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }
            const document = new HtmlDocument(res.body);
            let maxPage = null;
            try {
                maxPage = parseInt(document.querySelectorAll("button.text-small").pop().text.replaceAll("\n", "").replaceAll(" ", ""));
            } catch (_) {
                maxPage = 1;
            }
            return {
                comics: this.parseComics(document),
                maxPage: maxPage
            };
        },
        // enable tags suggestions
        enableTagsSuggestions: false,
    }

    imgDataDecode = (() => {
        const PREFIX = 'J7r';
        const SUFFIX = 'nQ';
        const MARKER1 = 'kD';
        const MARKER2 = 'W4s';
        const GROUP = 7;

        const PREFIX_LEN = PREFIX.length;
        const SUFFIX_LEN = SUFFIX.length;
        const MARKER1_LEN = MARKER1.length;
        const MARKER2_LEN = MARKER2.length;

        const CUSTOM = '_-9876543210abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

        // 自訂字母表字元碼 -> base64 6-bit 數值
        let customToValue = null;

        // 有原生 TextDecoder 就重複使用同一個 instance;沒有就是 null,
        // 走 fallback 手刻解碼。
        let textDecoder = null;
        let hasTextDecoder = false;
        let inited = false;

        function init() {
            if (inited) return;
            inited = true;

            customToValue = new Int16Array(128).fill(-1);
            for (let i = 0; i < CUSTOM.length; i++) {
                customToValue[CUSTOM.charCodeAt(i)] = i;
            }

            try {
                textDecoder = new TextDecoder('utf-8');
                hasTextDecoder = true;
            } catch (e) {
                // Flutter JS bridge 若是 QuickJS 之類的輕量引擎,可能沒有
                textDecoder = null;
                hasTextDecoder = false;
            }
        }

        /*
            Fallback: 手刻 UTF-8 -> JS 字串
            4-byte 序列(codepoint > 0xFFFF)要轉成 surrogate pair,
            不能直接 String.fromCharCode(codepoint)。
        */
        function decodeUTF8Fallback(bytes) {
            let out = '';
            const chunk = [];
            const FLUSH_SIZE = 4096; // 避免 fromCharCode.apply 參數過多

            const flush = () => {
                if (chunk.length) {
                    out += String.fromCharCode.apply(null, chunk);
                    chunk.length = 0;
                }
            };

            const n = bytes.length;
            for (let i = 0; i < n;) {
                const c = bytes[i++];

                if (c < 0x80) {
                    chunk.push(c);
                } else if (c < 0xE0) {
                    chunk.push(((c & 0x1F) << 6) | (bytes[i++] & 0x3F));
                } else if (c < 0xF0) {
                    chunk.push(
                        ((c & 0x0F) << 12) |
                        ((bytes[i++] & 0x3F) << 6) |
                        (bytes[i++] & 0x3F)
                    );
                } else {
                    let cp =
                        ((c & 0x07) << 18) |
                        ((bytes[i++] & 0x3F) << 12) |
                        ((bytes[i++] & 0x3F) << 6) |
                        (bytes[i++] & 0x3F);
                    cp -= 0x10000;
                    chunk.push(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
                }

                if (chunk.length >= FLUSH_SIZE) flush();
            }
            flush();
            return out;
        }

        function bytesToString(bytes) {
            return hasTextDecoder ? textDecoder.decode(bytes) : decodeUTF8Fallback(bytes);
        }

        /**
         * @param {string} rawStr 混淆後的原始字串
         * @param {string} [domain] 若提供,回傳的 url 會補上這個前綴
         * @returns {string[]}
         */
        function decodeStr(rawStr, domain) {
            init();

            if (
                typeof rawStr !== 'string' ||
                !rawStr.startsWith(PREFIX) ||
                !rawStr.endsWith(SUFFIX)
            ) {
                throw '未知圖片資料格式';
            }

            const body = rawStr.slice(PREFIX_LEN, rawStr.length - SUFFIX_LEN);

            const payloadLen = body.length - MARKER1_LEN - MARKER2_LEN;
            if (payloadLen <= 0) throw '未知圖片資料格式';

            const len1 = Math.floor(payloadLen / 3);
            const len2 = Math.floor((payloadLen - len1) / 2);
            const len3 = payloadLen - len1 - len2;

            const segAEnd = len2;
            const marker1Start = segAEnd;
            const segBStart = marker1Start + MARKER1_LEN;
            const segBEnd = segBStart + len3;
            const marker2Start = segBEnd;
            const segCStart = marker2Start + MARKER2_LEN;

            if (
                body.slice(marker1Start, segBStart) !== MARKER1 ||
                body.slice(marker2Start, segCStart) !== MARKER2 ||
                body.length - segCStart !== len1
            ) {
                throw '未知圖片資料格式';
            }

            const mixed =
                body.slice(segCStart) +
                body.slice(0, segAEnd) +
                body.slice(segBStart, segBEnd);

            const n = mixed.length;
            const codes = new Uint8Array(n);

            for (let i = 0, w = 0, block = 0; i < n; i += GROUP, block++) {
                const end = Math.min(i + GROUP, n);
                if (block & 1) {
                    for (let j = end - 1; j >= i; j--) codes[w++] = mixed.charCodeAt(j);
                } else {
                    for (let j = i; j < end; j++) codes[w++] = mixed.charCodeAt(j);
                }
            }

            const q = n >> 2;
            const r = n & 3;
            if (r === 1) throw '無效圖片資料';

            const bytesLen = q * 3 + (r === 0 ? 0 : r - 1);
            const bytes = new Uint8Array(bytesLen);
            const map = customToValue;

            let bi = 0;
            let i = 0;
            const fullEnd = q * 4;

            for (; i < fullEnd; i += 4) {
                const a = map[codes[i]];
                const b = map[codes[i + 1]];
                const c = map[codes[i + 2]];
                const d = map[codes[i + 3]];
                if ((a | b | c | d) < 0) throw '無效圖片資料';

                bytes[bi++] = (a << 2) | (b >> 4);
                bytes[bi++] = ((b & 15) << 4) | (c >> 2);
                bytes[bi++] = ((c & 3) << 6) | d;
            }

            if (r === 2) {
                const a = map[codes[i]];
                const b = map[codes[i + 1]];
                if ((a | b) < 0) throw '無效圖片資料';
                bytes[bi++] = (a << 2) | (b >> 4);
            } else if (r === 3) {
                const a = map[codes[i]];
                const b = map[codes[i + 1]];
                const c = map[codes[i + 2]];
                if ((a | b | c) < 0) throw '無效圖片資料';
                bytes[bi++] = (a << 2) | (b >> 4);
                bytes[bi++] = ((b & 15) << 4) | (c >> 2);
            }

            const json = bytesToString(bytes);
            const arr = JSON.parse(json);

            const out = new Array(arr.length);
            if (domain) {
                for (let k = 0; k < arr.length; k++) out[k] = domain + arr[k].url;
            } else {
                for (let k = 0; k < arr.length; k++) out[k] = arr[k].url;
            }
            return out;
        }

        return { decodeStr };
    })()

    /// single comic related
    comic = {
        onThumbnailLoad: (url) => {
            return {
                headers: this.headers
            }
        },
        loadInfo: async (id) => {
            const res = await Network.get(this.baseUrl + id);
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }
            const document = new HtmlDocument(res.body);
            const title = document.querySelector(".text-xl").text.trim().split("   ")[0]
            const cover = document.querySelector(".object-cover").attributes["src"];
            const description = document.querySelector("p.text-medium").text;
            const infos = document.querySelectorAll("div.py-1");
            const tags = { "作者": [], "类型": [], "标签": [] };
            for (let author of infos[0].querySelectorAll("a > span")) {
                let author_name = author.text.trim();
                if (author_name.endsWith(",")) {
                    author_name = author_name.slice(0, -1).trim();
                }
                tags["作者"].push(author_name);
            }
            for (let category of infos[1].querySelectorAll("a > span")) {
                let category_name = category.text.trim();
                if (category_name.endsWith(",")) {
                    category_name = category_name.slice(0, -1).trim();
                }
                tags["类型"].push(category_name);
            }
            for (let tag of infos[2].querySelectorAll("a")) {
                tags["标签"].push(tag.text.replace("\n", "").replaceAll(" ", "").replace("#", ""));
            }
            const mangaId = document.querySelector("#mangachapters").attributes["data-mid"];
            const jsonRes = await Network.get(`${this.apiUrl}/manga/get?mid=${mangaId}&mode=all&t=${Date.now()}`, this.headers);
            const jsonData = JSON.parse(jsonRes.body);
            const chapters = {};
            for (let ch of jsonData["data"]["chapters"]) {
                chapters[`${mangaId}@${ch["id"]}`] = ch["attributes"]["title"];
            }
            const recommend = [];
            for (let item of document.querySelectorAll("div.cardlist > div.pb-2")) {
                recommend.push(new Comic({
                    id: item.querySelector("a").attributes["href"],
                    title: item.querySelector("h3").text,
                    cover: item.querySelector("img").attributes["src"]
                }));
            }
            return new ComicDetails({
                title: title,
                cover: cover,
                description: description,
                tags: tags,
                chapters: chapters,
                recommend: recommend,
            });
        },

        loadEp: async (comicId, epId) => {
            const ids = epId.split("@");
            const res = await Network.get(`${this.apiUrl}/chapter/getinfo?m=${ids[0]}&c=${ids[1]}`, this.headers);
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            const jsonData = JSON.parse(res.body);
            return {
                images: this.imgDataDecode.decodeStr(jsonData["data"]["info"]["images"]["images"], this.imageUrl)
            };
        },

        // enable tags translate
        enableTagsTranslate: false,
    }
}