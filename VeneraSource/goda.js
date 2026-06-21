/** @type {import('./_venera_.js')} */
class Goda extends ComicSource {

    name = "GoDa漫画"

    key = "goda"

    version = "1.0.1"

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

    imgDataDecode = {
        T: '_-9876543210abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        S: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
        t: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
        b64(s) {
            s = s.replace(/=+$/, '');
            const b = [];
            for (let i = 0; i < s.length; i += 4) {
                const d = [this.t.indexOf(s[i]), this.t.indexOf(s[i + 1]), this.t.indexOf(s[i + 2]), this.t.indexOf(s[i + 3])];
                b.push(d[0] << 2 | d[1] >> 4);
                if (d[2] !== -1) b.push((d[1] & 15) << 4 | d[2] >> 2);
                if (d[3] !== -1) b.push((d[2] & 3) << 6 | d[3]);
            }
            let r = '';
            for (let i = 0; i < b.length; i++) {
                if (b[i] < 128) r += String.fromCharCode(b[i]);
                else if (b[i] < 224) r += String.fromCharCode((b[i] & 31) << 6 | b[++i] & 63);
                else if (b[i] < 240) r += String.fromCharCode((b[i] & 15) << 12 | (b[++i] & 63) << 6 | b[++i] & 63);
                else r += String.fromCharCode((b[i] & 7) << 18 | (b[++i] & 63) << 12 | (b[++i] & 63) << 6 | b[++i] & 63);
            }
            return r;
        },
        decodeStr(rawStr, domain) {
            const s1 = rawStr.slice(3, -2);
            const tl = s1.length - 5;
            const a = tl / 3 | 0;
            const b = tl - a * 2;
            const p = s1.slice(0, a);
            const m = s1.slice(a + 2, a + 2 + b);
            const s = s1.slice(a + 2 + b + 3);
            let r = '';
            for (let i = 0, j = 0; i < (s + p + m).length; i += 7, j++) {
                const c = (s + p + m).substring(i, i + 7);
                r += j & 1 ? [...c].reverse().join('') : c;
            }
            let mp = '';
            for (let i = 0; i < r.length; i++) mp += this.S[this.T.indexOf(r[i])];
            const pad = '=='.substring(0, (4 - mp.length % 4) % 4);
            const arr = JSON.parse(this.b64((mp + pad).replace(/-/g, '+').replace(/_/g, '/')));
            return domain ? arr.map(v => domain + v.url) : arr.map(v => v.url);
        }
    }

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