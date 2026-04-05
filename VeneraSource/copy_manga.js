class CopyManga extends ComicSource {

    name = "拷贝漫画"

    key = "copy_manga"

    version = "1.4.1"

    minAppVersion = "1.6.0"

    url = "https://gitlab.com/Canaan-HS/database/-/raw/main/VeneraSource/copy_manga.js"

    static defaultCopyRegion = "0"

    static defaultImageQuality = "1500"

    static defaultApiUrl = 'api.2024manga.com'

    static searchApi = "/api/v3/search/comic"

    static contentType = "application/x-www-form-urlencoded;charset=utf-8"

    static platform = "3"
    static appVersion = "3.0.6"
    static referer = "com.copymanga.app-3.0.6"
    static source = "copyApp"

    static pageLimit = 30
    static chapterBatchSize = 100
    static commentLimit = 20
    static maxPageDivisor = 21

    static maxRetries = 5

    async getReqID() {
        const reqIdUrl = "https://marketing.aiacgn.com/api/v2/adopr/query3/?format=json&ident=200100001";
        let reqId = "";
        try {
            const response = await Network.get(reqIdUrl, this.headers);
            if (response.status === 200) {
                const data = JSON.parse(response.body);
                reqId = data.results.request_id;
            }
        } catch (e) {
        }
        return reqId;
    }

    get headers() {
        return {
            "Authorization": this.loadData('token') ? `Token ${this.loadData('token')}` : '',
            "Accept": "application/json",
            "webp": "1",
            "platform": CopyManga.platform,
            "version": CopyManga.appVersion,
            "referer": CopyManga.referer,
            "source": CopyManga.source,
            "region": this.copyRegion,
        }
    }

    static parseComic(comic) {
        if (comic["comic"] != null) {
            comic = comic["comic"]
        }
        let tags = []
        if (comic["theme"] != null) {
            tags = comic["theme"].map(t => t["name"])
        }
        let author = null
        let authorNum = 0
        if (Array.isArray(comic["author"]) && comic["author"].length > 0) {
            author = comic["author"][0]["name"]
            authorNum = comic["author"].length
        }
        let result = {
            id: comic["path_word"],
            title: comic["name"],
            subTitle: author,
            cover: comic["cover"],
            tags: tags,
        }
        if (comic["sort"] != null) {
            let sort = comic["sort"]
            let riseSort = comic["rise_sort"]
            let popular = comic["popular"]
            result.description = `${sort} ${riseSort > 0 ? '▲' : riseSort < 0 ? '▽' : '-'}\n` +
                `${authorNum > 1 ? `${author} 等${authorNum}位` : author}\n` +
                `🔥${(popular / 10000).toFixed(1)}W`
        } else if (comic["datetime_updated"] != null) {
            result.description = comic["datetime_updated"]
        }
        return result
    }

    static maxPage(total, divisor = CopyManga.maxPageDivisor) {
        return (total - (total % divisor)) / divisor + 1
    }

    get apiUrl() {
        return `https://${this.loadSetting('base_url')}`
    }

    get copyRegion() {
        return this.loadSetting('region') || this.defaultCopyRegion
    }

    get imageQuality() {
        return this.loadSetting('image_quality') || this.defaultImageQuality
    }

    init() {
        this.author_path_word_dict = {}
    }


    /// account
    /// set this to null to desable account feature
    account = {
        login: async (account, pwd) => {
            let salt = randomInt(1000, 9999)
            let base64 = Convert.encodeBase64(Convert.encodeUtf8(`${pwd}-${salt}`))
            let res = await Network.post(
                `${this.apiUrl}/api/v3/login`,
                {
                    "Content-Type": CopyManga.contentType
                },
                `username=${account}&password=${base64}&salt=${salt}&source=Official&version=2.2.0&platform=3`
            );
            if (res.status === 200) {
                let data = JSON.parse(res.body)
                let token = data.results.token
                this.saveData('token', token)
                return "ok"
            } else {
                throw `Invalid Status Code ${res.status}`
            }
        },
        logout: () => {
            this.deleteData('token')
        },
        registerWebsite: "https://www.manga2026.com/web/login/loginByAccount"
    }

    /// explore pages
    explore = [
        {
            title: "拷贝漫画",
            type: "singlePageWithMultiPart",
            load: async () => {
                let dataStr = await Network.get(
                    `https://api.copy2000.online/api/v3/h5/homeIndex`,
                    this.headers
                )

                if (dataStr.status !== 200) {
                    throw `Invalid status code: ${dataStr.status}`
                }

                let data = JSON.parse(dataStr.body)

                let res = {}
                res["推荐"] = data["results"]["recComics"]["list"].map(CopyManga.parseComic)
                res["热门"] = data["results"]["hotComics"].map(CopyManga.parseComic)
                res["最新"] = data["results"]["newComics"].map(CopyManga.parseComic)
                res["完结"] = data["results"]["finishComics"]["list"].map(CopyManga.parseComic)
                res["今日排行"] = data["results"]["rankDayComics"]["list"].map(CopyManga.parseComic)
                res["本周排行"] = data["results"]["rankWeekComics"]["list"].map(CopyManga.parseComic)
                res["本月排行"] = data["results"]["rankMonthComics"]["list"].map(CopyManga.parseComic)

                return res
            }
        }
    ]

    static category_param_dict = {
        "全部": "",
        "爱情": "aiqing",
        "欢乐向": "huanlexiang",
        "冒险": "maoxian",
        "奇幻": "qihuan",
        "百合": "baihe",
        "校园": "xiaoyuan",
        "科幻": "kehuan",
        "东方": "dongfang",
        "耽美": "danmei",
        "生活": "shenghuo",
        "格斗": "gedou",
        "轻小说": "qingxiaoshuo",
        "悬疑": "xuanyi",
        "其他": "qita",
        "神鬼": "shengui",
        "职场": "zhichang",
        "TL": "teenslove",
        "萌系": "mengxi",
        "治愈": "zhiyu",
        "长条": "changtiao",
        "四格": "sige",
        "节操": "jiecao",
        "舰娘": "jianniang",
        "竞技": "jingji",
        "搞笑": "gaoxiao",
        "伪娘": "weiniang",
        "热血": "rexue",
        "励志": "lizhi",
        "性转换": "xingzhuanhuan",
        "彩色": "COLOR",
        "后宫": "hougong",
        "美食": "meishi",
        "侦探": "zhentan",
        "AA": "aa",
        "音乐舞蹈": "yinyuewudao",
        "魔幻": "mohuan",
        "战争": "zhanzheng",
        "历史": "lishi",
        "异世界": "yishijie",
        "惊悚": "jingsong",
        "机战": "jizhan",
        "都市": "dushi",
        "穿越": "chuanyue",
        "恐怖": "kongbu",
        "C100": "comiket100",
        "重生": "chongsheng",
        "C99": "comiket99",
        "C101": "comiket101",
        "C97": "comiket97",
        "C96": "comiket96",
        "生存": "shengcun",
        "宅系": "zhaixi",
        "武侠": "wuxia",
        "C98": "C98",
        "C95": "comiket95",
        "FATE": "fate",
        "转生": "zhuansheng",
        "无修正": "Uncensored",
        "仙侠": "xianxia",
        "LoveLive": "loveLive"
    }

    category = {
        title: "拷贝漫画",
        parts: [
            {
                name: "拷贝漫画",
                type: "fixed",
                categories: ["排行"],
                categoryParams: ["ranking"],
                itemType: "category"
            },
            {
                name: "主題",
                type: "fixed",
                categories: Object.keys(CopyManga.category_param_dict),
                categoryParams: Object.values(CopyManga.category_param_dict),
                itemType: "category"
            }
        ]
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            let category_url;
            if (category === "排行" || param === "ranking") {
                category_url = `https://api.copy2000.online/api/v3/ranks?limit=${CopyManga.pageLimit}&offset=${(page - 1) * CopyManga.pageLimit}&_update=true&type=1&audience_type=${options[0]}&date_type=${options[1]}`
            } else {
                if (category !== undefined && category !== null) {
                    param = CopyManga.category_param_dict[category] || "";
                }
                let top = options[0] || "";
                let ordering = (options[1] || "").replace("*", "-");
                category_url = `https://api.copy2000.online/api/v3/comics?limit=${CopyManga.pageLimit}&offset=${(page - 1) * CopyManga.pageLimit}&ordering=${ordering}&theme=${param}&top=${top}`
            }


            let res = await Network.get(
                category_url,
                this.headers
            )
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let data = JSON.parse(res.body)

            return {
                comics: data["results"]["list"].map(CopyManga.parseComic),
                maxPage: CopyManga.maxPage(data["results"]["total"]),
            }
        },
        optionList: [
            {
                options: [
                    "-全部",
                    "japan-日漫",
                    "korea-韩漫",
                    "west-美漫",
                    "finish-已完结"
                ],
                notShowWhen: null,
                showWhen: Object.keys(CopyManga.category_param_dict)
            },
            {
                options: [
                    "*datetime_updated-时间倒序",
                    "datetime_updated-时间正序",
                    "*popular-热度倒序",
                    "popular-热度正序",
                ],
                notShowWhen: null,
                showWhen: Object.keys(CopyManga.category_param_dict)
            },
            {
                options: [
                    "male-男频",
                    "female-女频"
                ],
                notShowWhen: null,
                showWhen: ["排行"]
            },
            {
                options: [
                    "day-上升最快",
                    "week-最近7天",
                    "month-最近30天",
                    "total-总榜单"
                ],
                notShowWhen: null,
                showWhen: ["排行"]
            }
        ]
    }

    search = {
        load: async (keyword, options, page) => {
            let author;
            if (keyword.startsWith("作者:")) {
                author = keyword.substring("作者:".length).trim();
            }
            let res;
            if (author && author in this.author_path_word_dict) {
                let path_word = encodeURIComponent(this.author_path_word_dict[author]);
                res = await Network.get(
                    `${this.apiUrl}/api/v3/comics?limit=${CopyManga.pageLimit}&offset=${(page - 1) * CopyManga.pageLimit}&ordering=-datetime_updated&author=${path_word}`,
                    this.headers
                )
            }
            else {
                let q_type = "";
                if (options && options[0]) {
                    q_type = options[0];
                }
                keyword = encodeURIComponent(keyword)
                res = await Network.get(
                    `${this.apiUrl}${CopyManga.searchApi}?limit=${CopyManga.pageLimit}&offset=${(page - 1) * CopyManga.pageLimit}&q=${keyword}&q_type=${q_type}`,
                    this.headers
                )
            }
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let data = JSON.parse(res.body)

            return {
                comics: data["results"]["list"].map(CopyManga.parseComic),
                maxPage: CopyManga.maxPage(data["results"]["total"]),
            }
        },
        optionList: [
            {
                type: "select",
                options: [
                    "-全部",
                    "name-名称",
                    "author-作者",
                    "local-汉化组"
                ],
                label: "搜索选项"
            }
        ]
    }

    favorites = {
        multiFolder: false,
        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            let is_collect = isAdding ? 1 : 0
            let token = this.loadData("token");
            let comicData = await Network.get(
                `${this.apiUrl}/api/v3/comic2/${comicId}?platform=3`,
                this.headers
            )
            if (comicData.status !== 200) {
                throw `Invalid status code: ${comicData.status}`
            }
            let comic_id = JSON.parse(comicData.body).results.comic.uuid
            let res = await Network.post(
                `${this.apiUrl}/api/v3/member/collect/comic`,
                {
                    ...this.headers,
                    "Content-Type": CopyManga.contentType,
                },
                `comic_id=${comic_id}&is_collect=${is_collect}&authorization=Token+${token}`
            )
            if (res.status === 401) {
                throw `Login expired`;
            }
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }
            return "ok"
        },
        loadComics: async (page, folder) => {
            let ordering = this.loadSetting('favorites_ordering') || '-datetime_updated';
            var res = await Network.get(
                `${this.apiUrl}/api/v3/member/collect/comics?limit=${CopyManga.pageLimit}&offset=${(page - 1) * CopyManga.pageLimit}&free_type=1&ordering=${ordering}`,
                this.headers
            )

            if (res.status === 401) {
                throw `Login expired`
            }

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let data = JSON.parse(res.body)

            return {
                comics: data["results"]["list"].map(CopyManga.parseComic),
                maxPage: CopyManga.maxPage(data["results"]["total"]),
            }
        }
    }

    comic = {
        loadInfo: async (id) => {
            let getChapters = async (id, groups) => {
                let fetchSingle = async (id, path) => {
                    let res = await Network.get(
                        `${this.apiUrl}/api/v3/comic/${id}/group/${path}/chapters?limit=${CopyManga.chapterBatchSize}&offset=0`,
                        this.headers
                    );
                    if (res.status !== 200) {
                        throw `Invalid status code: ${res.status}`;
                    }
                    let data = JSON.parse(res.body);
                    let eps = new Map();
                    data.results.list.forEach((e) => {
                        let title = e.name;
                        let id = e.uuid;
                        eps.set(id, title);
                    });
                    let maxChapter = data.results.total;
                    if (maxChapter > CopyManga.chapterBatchSize) {
                        let offset = CopyManga.chapterBatchSize;
                        while (offset < maxChapter) {
                            res = await Network.get(
                                `${this.apiUrl}/api/v3/comic/${id}/group/${path}/chapters?limit=${CopyManga.chapterBatchSize}&offset=${offset}`,
                                this.headers
                            );
                            if (res.status !== 200) {
                                throw `Invalid status code: ${res.status}`;
                            }
                            data = JSON.parse(res.body);
                            data.results.list.forEach((e) => {
                                let title = e.name;
                                let id = e.uuid;
                                eps.set(id, title)
                            });
                            offset += CopyManga.chapterBatchSize;
                        }
                    }
                    return eps;
                };
                let keys = Object.keys(groups);
                let result = {};
                let futures = [];
                for (let group of keys) {
                    let path = groups[group]["path_word"];
                    futures.push((async () => {
                        result[group] = await fetchSingle(id, path);
                    })());
                }
                await Promise.all(futures);
                let sortedResult = new Map();
                for (let key of keys) {
                    let name = groups[key]["name"];
                    sortedResult.set(name, result[key]);
                }
                return sortedResult;
            }

            let getFavoriteStatus = async (id) => {
                let res = await Network.get(`${this.apiUrl}/api/v3/comic2/${id}/query`, this.headers);
                if (res.status !== 200) {
                    throw `Invalid status code: ${res.status}`;
                }
                return JSON.parse(res.body).results.collect != null;
            }
            let results = await Promise.all([
                Network.get(
                    `${this.apiUrl}/api/v3/comic2/${id}?platform=3`,
                    this.headers
                ),
                getFavoriteStatus.bind(this)(id)
            ])

            if (results[0].status !== 200) {
                throw `Invalid status code: ${results[0].status}`;
            }

            let data = JSON.parse(results[0].body).results;
            let comicData = data.comic;

            let title = comicData.name;
            let cover = comicData.cover;
            let authors = comicData.author.map(e => e.name);
            if (Object.keys(this.author_path_word_dict).length > 100) {
                this.author_path_word_dict = {};
            }
            comicData.author.forEach(e => (this.author_path_word_dict[e.name] = e.path_word));
            let tags = comicData.theme.map(e => e?.name).filter(name => name !== undefined && name !== null);
            let updateTime = comicData.datetime_updated ? comicData.datetime_updated : "";
            let description = comicData.brief;
            let chapters = await getChapters(id, data.groups);
            let status = comicData.status.display;

            return {
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "作者": authors,
                    "更新": [updateTime],
                    "标签": tags,
                    "状态": [status],
                },
                chapters: chapters,
                isFavorite: results[1],
                subId: comicData.uuid
            }
        },
        loadEp: async (comicId, epId) => {
            let attempt = 0;
            let res;
            let data;

            while (attempt < CopyManga.maxRetries) {
                try {
                    let reqId = await this.getReqID();
                    res = await Network.get(
                        `${this.apiUrl}/api/v3/comic/${comicId}/chapter/${epId}?platform=3&_update=true&request_id=${reqId}`,
                        this.headers
                    );

                    if (res.status === 210) {
                        let waitTime = 40000;
                        try {
                            let responseBody = JSON.parse(res.body);
                            if (
                                responseBody.message &&
                                responseBody.message.includes("Expected available in")
                            ) {
                                let match = responseBody.message.match(/(\d+)\s*seconds/);
                                if (match && match[1]) {
                                    waitTime = parseInt(match[1]) * 1000;
                                }
                            }
                        } catch (e) {
                        }
                        console.log(`Chapter${epId} access too frequent, waiting ${waitTime / 1000}s`);
                        await new Promise((resolve) => setTimeout(resolve, waitTime));
                        throw "Retry";
                    }

                    if (res.status !== 200) {
                        throw `Invalid status code: ${res.status}`;
                    }

                    data = JSON.parse(res.body);
                    let imagesUrls = data.results.chapter.contents.map((e) => e.url);
                    let hdImagesUrls = imagesUrls.map((url) =>
                        url.replace(/\.h\d+x\.jpg$/, `.c${this.imageQuality}x.webp`)
                    )

                    return {
                        images: hdImagesUrls,
                    };
                } catch (error) {
                    if (error !== "Retry") {
                        throw error;
                    }
                    attempt++;
                    if (attempt >= CopyManga.maxRetries) {
                        throw error;
                    }
                }
            }
        },
        loadComments: async (comicId, subId, page, replyTo) => {
            let url = `${this.apiUrl}/api/v3/comments?comic_id=${subId}&limit=${CopyManga.commentLimit}&offset=${(page - 1) * CopyManga.commentLimit}`;
            if (replyTo) {
                url = url + `&reply_id=${replyTo}&_update=true`;
            }
            let res = await Network.get(
                url,
                this.headers,
            );

            if (res.status !== 200) {
                if (res.status === 210) {
                    throw "210：注册用户一天可以发5条评论"
                }
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);

            let total = data.results.total;

            return {
                comments: data.results.list.map(e => {
                    return {
                        userName: replyTo ? `${e.user_name}  👉  ${e.parent_user_name}` : e.user_name,
                        avatar: e.user_avatar,
                        content: e.comment,
                        time: e.create_at,
                        replyCount: e.count,
                        id: e.id,
                    }
                }),
                maxPage: CopyManga.maxPage(total, CopyManga.commentLimit),
            }
        },
        sendComment: async (comicId, subId, content, replyTo) => {
            let token = this.loadData("token");
            if (!token) {
                throw "未登录"
            }
            if (!replyTo) {
                replyTo = '';
            }
            let res = await Network.post(
                `${this.apiUrl}/api/v3/member/comment`,
                {
                    ...this.headers,
                    "Content-Type": CopyManga.contentType,
                },
                `comic_id=${subId}&comment=${encodeURIComponent(content)}&reply_id=${replyTo}`,
            );

            if (res.status === 401) {
                throw `Login expired`;
            }

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            } else {
                return "ok"
            }
        },
        loadChapterComments: async (comicId, epId, page, replyTo) => {
            let url = `${this.apiUrl}/api/v3/roasts?chapter_id=${epId}&limit=${CopyManga.commentLimit}&offset=${(page - 1) * CopyManga.commentLimit}`;
            let res = await Network.get(
                url,
                this.headers,
            );

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);

            let total = data.results.total;

            return {
                comments: data.results.list.map(e => {
                    return {
                        userName: e.user_name,
                        avatar: e.user_avatar,
                        content: e.comment,
                        time: e.create_at,
                        replyCount: null,
                        id: null,
                    }
                }),
                maxPage: CopyManga.maxPage(total, CopyManga.commentLimit),
            }
        },
        sendChapterComment: async (comicId, epId, content, replyTo) => {
            let token = this.loadData("token");
            if (!token) {
                throw "未登录"
            }
            let res = await Network.post(
                `${this.apiUrl}/api/v3/member/roast`,
                {
                    ...this.headers,
                    "Content-Type": CopyManga.contentType,
                },
                `chapter_id=${epId}&roast=${encodeURIComponent(content)}`,
            );

            if (res.status === 401) {
                throw `Login expired`;
            }

            if (res.status !== 200) {
                if (res.status === 210) {
                    throw `210:评论过于频繁或评论内容过短过长`;
                }
                throw `Invalid status code: ${res.status}`;
            } else {
                return "ok"
            }
        },
        onClickTag: (namespace, tag) => {
            if (namespace === "标签") {
                return {
                    action: 'category',
                    keyword: `${tag}`,
                    param: null,
                }
            }
            if (namespace === "作者") {
                return {
                    action: 'search',
                    keyword: `${namespace}:${tag}`,
                    param: null,
                }
            }
            throw "未支持此类Tag检索"
        }
    }

    settings = {
        favorites_ordering: {
            title: "收藏排序方式",
            type: "select",
            options: [
                { value: '-datetime_updated', text: '更新时间' },
                { value: '-datetime_modifier', text: '收藏时间' },
                { value: '-datetime_browse', text: '阅读时间' }
            ],
            default: '-datetime_updated',
        },
        region: {
            title: "CDN线路",
            type: "select",
            options: [
                { value: "0", text: '海外线路' },
                { value: "1", text: '大陆线路' },
            ],
            default: CopyManga.defaultCopyRegion,
        },
        image_quality: {
            title: "图片品质",
            type: "select",
            options: [
                { value: '800', text: '低 (800)' },
                { value: '1200', text: '中 (1200)' },
                { value: '1500', text: '高 (1500)' }
            ],
            default: CopyManga.defaultImageQuality,
        },
        base_url: {
            title: "API地址",
            type: "input",
            validator: '^(?!:\\/\\/)(?=.{1,253})([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$',
            default: CopyManga.defaultApiUrl,
        },
    }

    isAppVersionAfter(target) {
        let current = APP.version
        let targetArr = target.split('.')
        let currentArr = current.split('.')
        for (let i = 0; i < 3; i++) {
            if (parseInt(currentArr[i]) < parseInt(targetArr[i])) {
                return false
            }
        }
        return true
    }
}