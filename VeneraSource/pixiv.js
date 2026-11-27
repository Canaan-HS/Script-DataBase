class Pixiv extends ComicSource {
    name = "Pixiv"

    key = "pixiv"

    version = "1.0.0"

    minAppVersion = "1.6.0"

    url = "https://gitlab.com/Canaan-HS/database/-/raw/main/VeneraSource/pixiv.js"

    WEB_API = "https://www.pixiv.net"

    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/160.0.0.0 Safari/537.36"

    buildQuery(params) {
        if (!params) return ''
        let parts = []
        for (let key in params) {
            let value = params[key]
            if (value === null || value === undefined) continue
            if (Array.isArray(value)) {
                for (let item of value) {
                    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
                }
            } else {
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            }
        }
        return parts.length > 0 ? '?' + parts.join('&') : ''
    }

    encodeNext(obj) {
        return JSON.stringify(obj)
    }

    decodeNext(next) {
        if (!next) return null
        try {
            return JSON.parse(next)
        } catch (e) {
            return null
        }
    }

    arrayFromObject(obj) {
        let arr = []
        if (!obj) return arr
        if (Array.isArray(obj)) return obj
        for (let key in obj) {
            arr.push(obj[key])
        }
        return arr
    }

    parseCookieString(raw) {
        let cookies = []
        let parts = String(raw || '').split(';')
        for (let part of parts) {
            let idx = part.indexOf('=')
            if (idx <= 0) continue
            let name = part.substring(0, idx).trim()
            let value = part.substring(idx + 1).trim()
            if (value.length >= 2) {
                if ((value[0] === '"' && value[value.length - 1] === '"') ||
                    (value[0] === "'" && value[value.length - 1] === "'")) {
                    value = value.substring(1, value.length - 1)
                }
            }
            if (!name || !value) continue
            cookies.push(new Cookie({
                name: name,
                value: value,
                domain: '.pixiv.net',
            }))
        }
        return cookies
    }

    cookieValue(cookies, name) {
        for (let cookie of cookies) {
            if (cookie.name === name) return cookie.value
        }
        return null
    }

    buildHeaders(method, contentType) {
        let headers = {
            "User-Agent": this.USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": this.WEB_API + "/",
        }
        if (method !== 'GET') {
            headers["Origin"] = this.WEB_API
        }
        if (contentType) {
            headers["Content-Type"] = contentType
        }
        return headers
    }

    findCsrfToken(text) {
        if (!text) return null
        let i = text.indexOf('token')
        let checked = 0
        while (i >= 0 && checked < 30) {
            let m = text.substring(i, i + 100).match(/([0-9a-f]{32})/)
            if (m) return m[1]
            i = text.indexOf('token', i + 1)
            checked++
        }
        return null
    }

    async getCsrfToken(comicId) {
        let cached = this.loadData('csrf_token')
        if (cached) return String(cached)
        let path = comicId ? '/artworks/' + comicId : '/'
        let res = await Network.get(this.WEB_API + path, this.buildHeaders('GET'))
        if (!res || res.status !== 200) {
            throw '登入已過期'
        }
        let token = this.findCsrfToken(res.body)
        if (!token) {
            throw '登入已過期'
        }
        this.saveData('csrf_token', token)
        return token
    }

    async authHeaders(method, contentType, comicId) {
        let headers = this.buildHeaders(method, contentType)
        if (method !== 'GET') {
            headers['x-csrf-token'] = await this.getCsrfToken(comicId)
            let userId = this.getUserId()
            if (userId) {
                headers['x-user-id'] = String(userId)
            }
        }
        return headers
    }

    async request(method, path, params, body, auth, contentType, comicId) {
        let url = /^https?:\/\//.test(path) ? path : this.WEB_API + path
        url += this.buildQuery(params)
        let data = body
        if (body && typeof body !== 'string' && !(body instanceof ArrayBuffer)) {
            data = JSON.stringify(body)
            if (!contentType) {
                contentType = 'application/json; charset=utf-8'
            }
        }
        let headers = await this.authHeaders(method, contentType, comicId)
        return await Network.sendRequest(method, url, headers, data === undefined ? null : data)
    }

    apiGet(path, params) {
        return this.request('GET', path, params, null, false, null, null)
    }

    apiPost(path, body, contentType, comicId) {
        return this.request('POST', path, null, body, true, contentType || 'application/json; charset=utf-8', comicId)
    }

    check(res) {
        if (!res || res.status !== 200) {
            let detail = res && res.body ? String(res.body).substring(0, 300) : ''
            throw `Invalid status code: ${res ? res.status : 'no response'}${detail ? ' - ' + detail : ''}`
        }
        let json = JSON.parse(res.body)
        if (json && json.error) {
            throw json.message || 'Request failed'
        }
        if (json && Object.prototype.hasOwnProperty.call(json, 'body')) {
            return json.body
        }
        return json
    }

    assertOk(res, message) {
        if (!res || res.status !== 200) {
            let detail = res && res.body ? String(res.body).substring(0, 300) : ''
            throw `${message}: ${res ? res.status : 'no response'}${detail ? ' - ' + detail : ''}`
        }
        let json = JSON.parse(res.body)
        if (json && json.error) {
            throw `${message}: ${json.message || 'unknown error'}`
        }
        return 'ok'
    }

    init() {
        this._initDone = true
        if (this.loadData('account')) {
            this.refreshCategoryData().catch(() => { })
        }
    }

    getUserId() {
        return this.loadData('user_id')
    }

    requireAccount() {
        let account = this.loadData('account')
        if (account !== null && account !== undefined && account !== '') {
            return
        }
        throw '請先登入'
    }

    async detectUserId() {
        let res = await Network.get(this.WEB_API + '/', this.buildHeaders('GET'))
        if (!res || res.status !== 200) return null
        let m = res.body.match(/"userId":"?(\d+)"?/) || res.body.match(/"user_id":"?(\d+)"?/)
        return m ? m[1] : null
    }

    async applyCookies(raw) {
        let cookies = this.parseCookieString(raw)
        let session = this.cookieValue(cookies, 'PHPSESSID')
        if (!session) {
            return false
        }
        Network.deleteCookies(this.WEB_API + '/')
        Network.setCookies(this.WEB_API + '/', cookies)
        this.deleteData('csrf_token')
        let userId = await this.detectUserId()
        if (userId) {
            this.saveData('user_id', userId)
        }
        this.saveData('account', 'ok')
        await this.refreshCategoryData()
        return true
    }

    account = (() => {
        const source = this
        return {
            loginWithWebview: {
                get url() {
                    return 'https://accounts.pixiv.net/login?return_to=' +
                        encodeURIComponent('https://www.pixiv.net/') + '&source=pixiv'
                },
                checkStatus: (url, title) => {
                    let u = String(url || '')
                    if (u.indexOf('accounts.pixiv.net/login') >= 0) return false
                    if (u.indexOf('app-api.pixiv.net') >= 0) return false
                    return u.indexOf('www.pixiv.net/') >= 0
                },
                onLoginSuccess: async () => {
                    source.deleteData('csrf_token')
                    let userId = await source.detectUserId()
                    if (userId) {
                        source.saveData('user_id', userId)
                    }
                    source.saveData('account', 'ok')
                    await source.refreshCategoryData()
                    return 'ok'
                },
            },

            loginWithCookies: {
                fields: [
                    'PHPSESSID',
                    '其他 Cookie',
                ],
                validate: async (values) => {
                    let raw = values && values[0] ? String(values[0]).trim() : ''
                    let extra = values && values[1] ? String(values[1]).trim() : ''
                    if (!raw) return false
                    if (raw.indexOf('PHPSESSID=') < 0 && raw.indexOf(';') < 0) {
                        raw = 'PHPSESSID=' + raw
                    }
                    if (extra) {
                        let pairs = extra.split(';').map((s) => s.trim()).filter((s) => {
                            if (!s || s.indexOf('=') <= 0) return false
                            return s.substring(0, s.indexOf('=')).trim() !== 'PHPSESSID'
                        })
                        if (pairs.length > 0) {
                            raw += (raw.endsWith(';') ? ' ' : '; ') + pairs.join('; ')
                        }
                    }
                    return await source.applyCookies(raw)
                },
            },

            logout: () => {
                Network.deleteCookies(source.WEB_API + '/')
                Network.deleteCookies('https://pixiv.net/')
                let userId = source.getUserId()
                if (userId) {
                    source.deleteData('recommend_users_' + userId)
                    source.deleteData('follow_tags_' + userId)
                    source.deleteData('following_users_' + userId)
                }
                source.deleteData('account')
                source.deleteData('user_id')
                source.deleteData('csrf_token')
                source.deleteData('recommend_users')
                source.deleteData('favorite_tags')
                source.deleteData('trend_tags')
            },

            registerWebsite: 'https://accounts.pixiv.net/signup',
        }
    })()

    cleanCaption(html) {
        if (!html) return ""
        return html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
    }

    coverToLarge(url) {
        if (!url) return null
        let out = url.replace(/\/c\/[^/]+\//, '/')
        if (out.indexOf('/custom-thumb/') >= 0) {
            out = out.replace('/custom-thumb/', '/img-master/')
        }
        if (out.indexOf('_custom1200.jpg') >= 0) {
            return out.replace('_custom1200.jpg', '_master1200.jpg')
        }
        if (out.indexOf('_square1200.jpg') >= 0) {
            return out.replace('_square1200.jpg', '_master1200.jpg')
        }
        return out
    }

    rewriteHost(url) {
        if (!url) return url
        let mode = this.loadSetting('imageHost') || 'i.pximg.net'
        let host = mode
        if (mode === 'custom') {
            host = this.loadSetting('customImageHost') || 'i.pximg.net'
        }
        if (host === 'i.pximg.net') return url
        return url.replace(/\/\/i\.pximg\.net\//, '//' + host + '/')
    }

    normalizeIllust(item) {
        if (!item) return null
        let urls = item.urls || {}
        let imageUrls = item.image_urls || {}
        let tags = []
        let rawTags = item.tags
        if (Array.isArray(rawTags)) {
            for (let tag of rawTags) {
                if (typeof tag === 'string') {
                    tags.push({ name: tag })
                } else if (tag) {
                    tags.push({ name: tag.tag || tag.name || '' })
                }
            }
        } else if (rawTags && Array.isArray(rawTags.tags)) {
            for (let tag of rawTags.tags) {
                if (typeof tag === 'string') {
                    tags.push({ name: tag })
                } else if (tag) {
                    tags.push({ name: tag.tag || tag.name || '' })
                }
            }
        }
        let large = imageUrls.large || urls.regular || urls['1200x1200'] ||
            urls.large || this.coverToLarge(item.url || item.url_small || null)
        let medium = imageUrls.medium || urls.small || urls['540x540'] ||
            urls.thumb || item.url || large
        let original = imageUrls.original || urls.original || null
        let pages = []
        if (Array.isArray(item.meta_pages)) {
            for (let page of item.meta_pages) {
                pages.push({ image_urls: page.image_urls || page.urls || {} })
            }
        }
        let user = item.user || {}
        let userId = user.id || item.userId || item.user_id || item.authorId || ''
        let userName = user.name || item.userName || item.user_name || ''
        let bookmarkData = item.bookmarkData || null
        return {
            id: String(item.id || item.illust_id || item.illustId || ''),
            title: item.title || item.illustTitle || '',
            caption: item.caption || item.description || item.illustComment || '',
            user: { id: String(userId), name: userName },
            image_urls: { medium: medium, large: large, original: original },
            meta_pages: pages,
            meta_single_page: { original_image_url: original || large },
            page_count: Number(item.pageCount || item.illust_page_count || (pages.length > 0 ? pages.length : 1)) || 1,
            tags: tags,
            create_date: item.createDate || item.create_date || item.uploadDate || '',
            is_bookmarked: !!(item.is_bookmarked || bookmarkData),
            total_bookmarks: Number(item.bookmarkCount || item.rating_count || 0) || 0,
            total_comments: Number(item.commentCount || 0) || 0,
            series: null,
        }
    }

    pickPageUrl(urls, quality) {
        if (!urls) return null
        if (quality === 'original') {
            return urls.original || urls.regular || urls.large || urls.small
        }
        return urls[quality] || urls.regular || urls.large || urls.small
    }

    pickSingleUrl(illust, quality) {
        if (quality === 'original') {
            return (illust.meta_single_page && illust.meta_single_page.original_image_url) ||
                (illust.image_urls && illust.image_urls.large)
        }
        return (illust.image_urls && (illust.image_urls[quality] || illust.image_urls.large)) || null
    }

    pickCover(illust) {
        let quality = this.loadSetting('imageQuality') || 'large'
        if (quality === 'original') {
            if (illust.meta_pages && illust.meta_pages.length > 0) {
                return this.pickPageUrl(illust.meta_pages[0].image_urls, 'original')
            }
            return (illust.meta_single_page && illust.meta_single_page.original_image_url) ||
                (illust.image_urls && illust.image_urls.large)
        }
        return (illust.image_urls && (illust.image_urls[quality] || illust.image_urls.large)) || null
    }

    parseComic(raw) {
        let illust = this.normalizeIllust(raw)
        if (!illust) return null
        let tags = []
        for (let tag of (illust.tags || [])) {
            if (tag.name) tags.push(tag.name)
        }
        return new Comic({
            id: String(illust.id),
            title: illust.title,
            subTitle: illust.user.name,
            cover: this.rewriteHost(this.pickCover(illust)),
            tags: tags,
            description: this.cleanCaption(illust.caption),
            maxPage: illust.page_count || 1,
        })
    }

    parseIllustList(data) {
        let arr = []
        if (Array.isArray(data)) {
            arr = data
        } else if (data && Array.isArray(data.illusts)) {
            arr = data.illusts
        } else if (data && data.illustManga && Array.isArray(data.illustManga.data)) {
            arr = data.illustManga.data
        } else if (data && Array.isArray(data.works)) {
            arr = data.works
        } else if (data && Array.isArray(data.contents)) {
            arr = data.contents
        } else if (data && data.thumbnails && data.thumbnails.illust) {
            arr = this.arrayFromObject(data.thumbnails.illust)
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
            for (let key in data) {
                if (data[key] && data[key].id) arr.push(data[key])
            }
        }
        let comics = []
        for (let item of arr) {
            let comic = this.parseComic(item)
            if (comic) comics.push(comic)
        }
        return comics
    }

    hasMore(data, count) {
        if (count <= 0) return false
        if (data && data.hasNext === false) return false
        if (data && data.page && data.page.isLastPage) return false
        return true
    }

    rankingMaxPage(body, page) {
        if (!body) return page
        if (body.next === false) return page
        if (body.next) return page + 1
        let total = Number(body.rank_total)
        if (total > 0) return Math.ceil(total / 50)
        return page
    }

    async loadRanking(mode, page) {
        try {
            let res = await this.apiGet('/ranking.php', {
                mode: mode,
                content: 'illust',
                p: page,
                format: 'json',
            })
            let body = this.check(res)
            return {
                comics: this.parseIllustList(body),
                maxPage: this.rankingMaxPage(body, page),
            }
        } catch (e) {
            let msg = String(e)
            if (page > 1 && msg.indexOf('404') >= 0) {
                return { comics: [], maxPage: page - 1 }
            }
            throw e
        }
    }

    sortValue(sort) {
        if (sort === 'date_asc') return 'date'
        if (sort === 'popular_desc') return 'popular_d'
        return 'date_d'
    }

    searchMode(target) {
        if (target === 'exact_match_for_tags') return 's_tag_full'
        if (target === 'title_and_caption') return 's_tc'
        return 's_tag'
    }

    searchPath(word) {
        return '/ajax/search/artworks/' + encodeURIComponent(word || '')
    }

    searchParams(word, sort, target, page) {
        return {
            word: word,
            order: this.sortValue(sort),
            mode: 'all',
            p: page,
            s_mode: this.searchMode(target),
            type: 'all',
            lang: 'zh',
        }
    }

    translatedTagName(tag, translation) {
        let name = String(tag || '')
        let entry = translation && translation[name]
        if (!entry) return name
        return entry.zh_tw || entry.zh || entry.en || entry.romaji || name
    }

    tagItems(rawTags, translation, limit) {
        let items = []
        let seen = {}
        for (let raw of this.arrayFromObject(rawTags)) {
            let tag = typeof raw === 'string' ? raw : (raw && raw.tag)
            if (!tag || seen[tag]) continue
            seen[tag] = true
            items.push({
                label: this.translatedTagName(tag, translation),
                tag: String(tag),
            })
            if (limit > 0 && items.length >= limit) break
        }
        return items
    }

    followTagsFromUsers(users, translation, limit) {
        let counts = {}
        for (let user of this.arrayFromObject(users)) {
            for (let illust of this.arrayFromObject(user && user.illusts)) {
                for (let tag of (illust && illust.tags) || []) {
                    if (!tag) continue
                    counts[tag] = (counts[tag] || 0) + 1
                }
            }
        }
        let ranked = []
        for (let tag in counts) {
            ranked.push({ tag: tag, count: counts[tag] })
        }
        ranked.sort((a, b) => b.count - a.count || String(a.tag).localeCompare(String(b.tag)))
        return this.tagItems(ranked.map((x) => x.tag), translation, limit)
    }

    followingUsersFrom(body) {
        let users = []
        for (let user of this.arrayFromObject(body && body.users)) {
            let id = user && (user.userId || user.id)
            if (!id) continue
            users.push({
                name: user.userName || user.name || user.pixivId || String(id),
                id: String(id),
            })
        }
        return users
    }

    async refreshCategoryData() {
        let favoriteTags = []
        let trendTags = []
        let followTags = []
        let followingUsers = []
        let translation = {}

        try {
            let res = await this.apiGet('/ajax/search/suggestion', {
                mode: 'all',
                lang: 'zh_tw',
            })
            let body = this.check(res)
            translation = body.tagTranslation || {}
            favoriteTags = this.tagItems(body.myFavoriteTags, translation, 20)
            trendTags = this.tagItems(body.popularTags && body.popularTags.illust, translation, 30)
            this.saveData('favorite_tags', favoriteTags)
            this.saveData('trend_tags', trendTags)
        } catch (e) {
        }

        let userId = this.getUserId()
        if (userId && this.loadData('account')) {
            try {
                let res = await this.apiGet('/ajax/user/' + userId + '/following', {
                    offset: 0,
                    limit: 12,
                    rest: 'show',
                    lang: 'zh_tw',
                })
                let body = this.check(res)
                followingUsers = this.followingUsersFrom(body)
                followTags = this.followTagsFromUsers(body.users, translation, 20)
                this.saveData('follow_tags_' + userId, followTags)
                this.saveData('following_users_' + userId, followingUsers)
            } catch (e) {
            }
        }

        return {
            favorite: favoriteTags.length,
            popular: trendTags.length,
            follow: followTags.length,
            following: followingUsers.length,
        }
    }

    getFavoriteTags() {
        let cached = this.loadData('favorite_tags')
        return Array.isArray(cached) ? cached : []
    }

    getTrendTags() {
        let cached = this.loadData('trend_tags')
        return Array.isArray(cached) ? cached : []
    }

    getFollowTags() {
        let userId = this.getUserId()
        if (!userId) return []
        let cached = this.loadData('follow_tags_' + userId)
        return Array.isArray(cached) ? cached : []
    }

    getFollowingUsers() {
        let userId = this.getUserId()
        if (!userId) return []
        let cached = this.loadData('following_users_' + userId)
        return Array.isArray(cached) ? cached : []
    }

    categoryTagItems(items) {
        let out = []
        for (let item of items || []) {
            out.push({
                label: item.label,
                target: {
                    page: 'category',
                    attributes: { category: 'tag', param: item.tag },
                },
            })
        }
        return out
    }

    categoryUserItems(items) {
        let out = []
        for (let item of items || []) {
            out.push({
                label: item.name,
                target: {
                    page: 'category',
                    attributes: { category: 'artist', param: item.id },
                },
            })
        }
        return out
    }

    exploreViewMore(param) {
        return {
            page: 'category',
            attributes: { category: 'explore', param: param },
        }
    }

    async loadExplorePreview(title, kind, param, viewMore) {
        try {
            let path
            let params = { lang: 'zh' }
            if (kind === 'new') {
                path = '/ajax/illust/new'
                params.lastId = 0
                params.limit = 12
                params.type = param === 'manga_new' ? 'manga' : 'illust'
                params.r18 = 'false'
            } else if (kind === 'follow') {
                if (!this.loadData('account')) return null
                path = '/ajax/follow_latest/illust'
                params.mode = 'all'
                params.p = 1
            } else if (kind === 'ranking') {
                path = '/ranking.php'
                params.mode = param
                params.content = 'illust'
                params.p = 1
                params.format = 'json'
            } else {
                return null
            }
            let res = await this.apiGet(path, params)
            let body = this.check(res)
            let comics = this.parseIllustList(body)
            return {
                title: title,
                comics: comics.slice(0, 12),
                viewMore: viewMore,
            }
        } catch (e) {
            return {
                title: title,
                comics: [],
                viewMore: viewMore,
            }
        }
    }

    async fetchNewIllusts(type, page) {
        let lastId = 0
        let body = null
        for (let i = 0; i < page; i++) {
            let res = await this.apiGet('/ajax/illust/new', {
                lastId: lastId,
                limit: 48,
                type: type,
                r18: 'false',
                lang: 'zh',
            })
            body = this.check(res)
            if (!body.lastId) break
            lastId = body.lastId
        }
        return this.parseIllustList(body)
    }

    async loadExploreCategory(param, page) {
        let target = param || 'illust_new'
        if (target === 'illust_new' || target === 'manga_new') {
            let comics = await this.fetchNewIllusts(
                target === 'manga_new' ? 'manga' : 'illust', page)
            return { comics: comics, maxPage: comics.length > 0 ? page + 1 : page }
        }
        if (target === 'follow') {
            this.requireAccount()
            let res = await this.apiGet('/ajax/follow_latest/illust', {
                mode: 'all',
                p: page,
                lang: 'zh',
            })
            let body = this.check(res)
            let comics = this.parseIllustList(body)
            return {
                comics: comics,
                maxPage: this.hasMore(body, comics.length) ? page + 1 : page,
            }
        }
        let mode = String(target).replace(/^ranking_/, '')
        return await this.loadRanking(mode, page)
    }

    explore = [
        {
            title: "Pixiv",
            type: "multiPartPage",
            load: async () => {
                let configs = [
                    ['推薦插畫', 'new', 'illust_new', 'illust_new'],
                    ['推薦漫畫', 'new', 'manga_new', 'manga_new'],
                    ['關注新作', 'follow', null, 'follow'],
                    ['日榜', 'ranking', 'daily', 'ranking_daily'],
                    ['週榜', 'ranking', 'weekly', 'ranking_weekly'],
                    ['月榜', 'ranking', 'monthly', 'ranking_monthly'],
                    ['新人榜', 'ranking', 'rookie', 'ranking_rookie'],
                    ['R18 日榜', 'ranking', 'daily_r18', 'ranking_daily_r18'],
                    ['R18 週榜', 'ranking', 'weekly_r18', 'ranking_weekly_r18'],
                ]
                let parts = []
                for (let cfg of configs) {
                    let part = await this.loadExplorePreview(cfg[0], cfg[1], cfg[2], this.exploreViewMore(cfg[3]))
                    if (part) parts.push(part)
                }
                return parts
            },
        },
    ]

    category = {
        title: "Pixiv",
        parts: [
            {
                name: "喜歡的標籤",
                type: "dynamic",
                loader: () => this.categoryTagItems(this.getFavoriteTags()),
            },
            {
                name: "熱門標籤",
                type: "dynamic",
                loader: () => this.categoryTagItems(this.getTrendTags()),
            },
            {
                name: "追蹤標籤",
                type: "dynamic",
                loader: () => this.categoryTagItems(this.getFollowTags()),
            },
            {
                name: "關注畫師",
                type: "dynamic",
                loader: () => this.categoryUserItems(this.getFollowingUsers()),
            },
        ],
        enableRankingPage: false,
    }

    async resolveUserId(nameOrId) {
        let value = String(nameOrId || '')
        if (/^\d+$/.test(value)) return value
        let res = await this.apiGet('/ajax/search/users', {
            nick: value,
            s_mode: 's_usr',
            i: 1,
            p: 1,
            lang: 'zh',
        })
        let body = this.check(res)
        if (body.page && Array.isArray(body.page.userIds) && body.page.userIds.length > 0) {
            return String(body.page.userIds[0])
        }
        return null
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            if (category === 'explore') {
                return await this.loadExploreCategory(param, page)
            }
            let sort = (options && options[0]) || 'date_desc'
            if (category === 'artist') {
                let userId = await this.resolveUserId(param)
                if (!userId) return { comics: [], maxPage: page }
                let profileRes = await this.apiGet('/ajax/user/' + userId + '/profile/all', {
                    sensitiveFilterMode: 'userSetting',
                    lang: 'zh',
                })
                let profile = this.check(profileRes)
                let illustIds = []
                for (let id in (profile.illusts || {})) {
                    illustIds.push(id)
                }
                illustIds.sort((a, b) => Number(b) - Number(a))
                let start = (page - 1) * 30
                let ids = illustIds.slice(start, start + 30)
                if (ids.length === 0) return { comics: [], maxPage: page }
                let res = await this.apiGet('/ajax/user/' + userId + '/illusts', {
                    'ids[]': ids,
                    lang: 'zh',
                })
                let body = this.check(res)
                let comics = this.parseIllustList(body)
                return { comics: comics, maxPage: start + 30 < illustIds.length ? page + 1 : page }
            }
            let word = param || category || ''
            let res = await this.apiGet(this.searchPath(word), this.searchParams(word, sort, 'exact_match_for_tags', page))
            let body = this.check(res)
            let comics = this.parseIllustList(body)
            let total = body.illustManga && body.illustManga.total ? Number(body.illustManga.total) : 0
            return { comics: comics, maxPage: total > page * 60 ? page + 1 : page }
        },

        optionList: [
            {
                label: "排序",
                options: [
                    "date_desc-最新",
                    "date_asc-最早",
                    "popular_desc-熱門",
                ],
                notShowWhen: ['artist', 'explore'],
            },
        ],

        ranking: {
            options: [
                "daily-日榜",
                "weekly-週榜",
                "monthly-月榜",
                "rookie-新人榜",
                "daily_r18-R18 日榜",
                "weekly_r18-R18 週榜",
            ],
            load: async (option, page) => {
                return await this.loadRanking(option || 'daily', page)
            },
        },
    }

    search = {
        loadNext: async (keyword, options, next) => {
            let marker = this.decodeNext(next) || { page: 1 }
            let sort = (options && options[0]) || 'date_desc'
            let target = (options && options[1]) || 'partial_match_for_tags'
            let res = await this.apiGet(this.searchPath(keyword), this.searchParams(keyword, sort, target, marker.page || 1))
            let body = this.check(res)
            let comics = this.parseIllustList(body)
            let total = body.illustManga && body.illustManga.total ? Number(body.illustManga.total) : 0
            return {
                comics: comics,
                next: total > (marker.page || 1) * 60 && comics.length > 0
                    ? this.encodeNext({ page: (marker.page || 1) + 1 }) : null,
            }
        },

        optionList: [
            {
                label: "排序",
                options: [
                    "date_desc-最新",
                    "date_asc-最早",
                    "popular_desc-熱門",
                ],
            },
            {
                label: "搜尋範圍",
                options: [
                    "partial_match_for_tags-標籤(部分)",
                    "exact_match_for_tags-標籤(完整)",
                    "title_and_caption-標題與簡介",
                ],
            },
        ],

        enableTagsSuggestions: true,

        onTagSuggestionSelected: (namespace, tag) => tag,
    }

    tagFolderId(restrict, name) {
        return 'tag:' + (restrict || 'public') + ':' + name
    }

    parseTagFolder(folderId) {
        if (!folderId || folderId.indexOf('tag:') !== 0) return null
        let rest = folderId.substring(4)
        let idx = rest.indexOf(':')
        if (idx < 0) return null
        return { restrict: rest.substring(0, idx), name: rest.substring(idx + 1) }
    }

    async getBookmarkDetail(comicId) {
        let res = await this.apiGet('/ajax/illust/' + comicId + '/bookmarkData', { lang: 'zh' })
        let body = this.check(res)
        let data = body.bookmarkData || null
        return {
            is_bookmarked: !!data,
            restrict: data && data.private ? 'private' : 'public',
            tags: [],
        }
    }

    favorites = {
        multiFolder: true,

        addOrDelFavorite: async (comicId, folderId, isAdding, favoriteId) => {
            this.requireAccount()
            let parts = this.parseTagFolder(folderId)
            if (!isAdding) {
                let res = await this.apiPost('/ajax/illusts/bookmarks/delete', {
                    illust_id: String(comicId),
                }, null, comicId)
                return this.assertOk(res, '刪除收藏失敗')
            }
            let restrict = parts && parts.restrict === 'private' ? 1 : 0
            let tags = []
            if (parts && parts.name && parts.name !== '未分類') tags.push(parts.name)
            let body = {
                illust_id: String(comicId),
                restrict: restrict,
                comment: '',
                tags: tags,
            }
            let res = await this.apiPost('/ajax/illusts/bookmarks/add', body, null, comicId)
            return this.assertOk(res, '加入收藏失敗')
        },

        loadFolders: async (comicId) => {
            this.requireAccount()
            let folders = {
                'public': '公開收藏',
                'private': '私密收藏',
            }
            let favorited = []
            let userId = this.getUserId()
            if (userId) {
                try {
                    let res = await this.apiGet('/ajax/user/' + userId + '/illusts/bookmark/tags', { lang: 'zh' })
                    let body = this.check(res)
                    for (let tag of (body.public || [])) {
                        folders[this.tagFolderId('public', tag.tag)] = `${tag.tag} (${tag.cnt})`
                    }
                    for (let tag of (body.private || [])) {
                        folders[this.tagFolderId('private', tag.tag)] = `${tag.tag} (${tag.cnt})`
                    }
                } catch (e) {
                }
            }
            if (comicId) {
                try {
                    let detail = await this.getBookmarkDetail(comicId)
                    if (detail.is_bookmarked) {
                        favorited.push(detail.restrict)
                    }
                } catch (e) {
                }
            }
            return { folders: folders, favorited: favorited }
        },

        addFolder: async (name) => {
            return 'ok'
        },

        deleteFolder: async (folderId) => {
            return 'ok'
        },

        loadNext: async (next, folder) => {
            this.requireAccount()
            let marker = this.decodeNext(next) || { offset: 0 }
            let userId = this.getUserId()
            let rest = 'show'
            let tag = ''
            let parts = this.parseTagFolder(folder)
            if (parts) {
                rest = parts.restrict === 'private' ? 'hide' : 'show'
                if (parts.name !== '未分類') tag = parts.name
            } else if (folder === 'private') {
                rest = 'hide'
            }
            let res = await this.apiGet('/ajax/user/' + userId + '/illusts/bookmarks', {
                tag: tag,
                offset: marker.offset || 0,
                limit: 48,
                rest: rest,
                order: 'desc',
                mode: 'all',
                lang: 'zh',
            })
            let body = this.check(res)
            let comics = this.parseIllustList(body)
            let total = Number(body.total || 0)
            let offset = (marker.offset || 0) + comics.length
            return {
                comics: comics,
                next: comics.length > 0 && offset < total ? this.encodeNext({ offset: offset }) : null,
            }
        },

        singleFolderForSingleComic: false,
    }

    comic = {
        loadInfo: async (id) => {
            let res = await this.apiGet('/ajax/illust/' + id, { lang: 'zh' })
            let illust = this.normalizeIllust(this.check(res))
            let related = []
            try {
                let relatedRes = await this.apiGet('/ajax/illust/' + id + '/recommend/init', {
                    limit: 12,
                    lang: 'zh',
                })
                let relatedBody = this.check(relatedRes)
                related = this.parseIllustList(relatedBody.illusts || relatedBody)
            } catch (e) {
            }
            let tags = {}
            tags['作者'] = [illust.user.name]
            tags['標籤'] = []
            for (let tag of (illust.tags || [])) {
                if (tag.name) tags['標籤'].push(tag.name)
            }
            let chapters = { '0': illust.page_count > 1 ? `1-${illust.page_count}` : '1' }
            return new ComicDetails({
                title: illust.title,
                subtitle: illust.user.name,
                cover: this.rewriteHost(this.pickCover(illust)),
                description: this.cleanCaption(illust.caption),
                tags: tags,
                chapters: chapters,
                isFavorite: illust.is_bookmarked || false,
                recommend: related,
                commentCount: illust.total_comments || 0,
                likesCount: illust.total_bookmarks || 0,
                uploader: illust.user.name,
                uploadTime: illust.create_date,
                updateTime: illust.create_date,
                url: `https://www.pixiv.net/artworks/${illust.id}`,
                maxPage: illust.page_count || 1,
            })
        },

        loadEp: async (comicId, epId) => {
            let targetId = epId && epId !== '0' ? epId : comicId
            let res = await this.apiGet('/ajax/illust/' + targetId + '/pages', { lang: 'zh' })
            let pages = this.check(res)
            let quality = this.loadSetting('imageQuality') || 'large'
            let images = []
            for (let page of this.arrayFromObject(pages)) {
                let url = this.pickPageUrl(page.urls || {}, quality)
                if (url) images.push(this.rewriteHost(url))
            }
            return { images: images }
        },

        loadThumbnails: async (id, next) => {
            let res = await this.apiGet('/ajax/illust/' + id + '/pages', { lang: 'zh' })
            let pages = this.check(res)
            let quality = this.loadSetting('imageQuality') || 'large'
            let thumbQuality = quality === 'original' ? 'regular' : quality
            let thumbnails = []
            for (let page of this.arrayFromObject(pages)) {
                let url = this.pickPageUrl(page.urls || {}, thumbQuality)
                if (url) thumbnails.push(this.rewriteHost(url))
            }
            return { thumbnails: thumbnails, next: null }
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                url: this.rewriteHost(url),
                headers: {
                    "referer": this.WEB_API + "/",
                    "user-agent": this.USER_AGENT,
                },
            }
        },

        onThumbnailLoad: (url) => {
            return {
                url: this.rewriteHost(url),
                headers: {
                    "referer": this.WEB_API + "/",
                    "user-agent": this.USER_AGENT,
                },
            }
        },

        loadComments: async (comicId, subId, page, replyTo) => {
            let path
            let params
            if (replyTo) {
                path = '/ajax/illusts/comments/replies'
                params = { comment_id: replyTo, page: page, lang: 'zh' }
            } else {
                path = '/ajax/illusts/comments/roots'
                params = {
                    illust_id: comicId,
                    offset: page > 1 ? (page - 1) * 20 : 0,
                    limit: 20,
                    lang: 'zh',
                }
            }
            let res = await this.apiGet(path, params)
            let body = this.check(res)
            let comments = []
            for (let item of (body.comments || [])) {
                comments.push(this.parseComment(item))
            }
            return { comments: comments, maxPage: body.hasNext ? page + 1 : page }
        },

        sendComment: async (comicId, subId, content, replyTo) => {
            this.requireAccount()
            let detailRes = await this.apiGet('/ajax/illust/' + comicId, { lang: 'zh' })
            let detail = this.check(detailRes)
            let form = 'illust_id=' + encodeURIComponent(comicId) +
                '&author_user_id=' + encodeURIComponent(detail.userId || '') +
                '&type=comment' +
                '&comment=' + encodeURIComponent(content)
            if (replyTo) {
                form += '&parent_id=' + encodeURIComponent(replyTo)
            }
            let res = await this.apiPost('/rpc/post_comment.php', form,
                'application/x-www-form-urlencoded', comicId)
            return this.assertOk(res, '留言失敗')
        },

        idMatch: "^(\\d+)$",

        onClickTag: (namespace, tag) => {
            if (namespace === '作者') {
                return {
                    page: 'category',
                    attributes: { category: 'artist', param: tag },
                }
            }
            return {
                page: 'search',
                attributes: { keyword: tag },
            }
        },

        link: {
            domains: ['pixiv.net', 'www.pixiv.net'],
            linkToId: (url) => {
                let match = String(url || '').match(/artworks\/(\d+)/) ||
                    String(url || '').match(/[?&]illust_id=(\d+)/)
                return match ? match[1] : null
            },
        },

        enableTagsTranslate: true,
    }

    parseComment(item) {
        let avatar = item.img || ''
        if (avatar) avatar = this.rewriteHost(avatar)
        return new Comment({
            userName: item.userName || '',
            avatar: avatar || undefined,
            content: item.comment || '',
            time: item.commentDate || '',
            replyCount: item.hasReplies ? 1 : 0,
            id: item.id !== undefined ? String(item.id) : undefined,
        })
    }

    loadAiShowSetting() {
        let value = this.loadData('local_ai_show')
        return value === null || value === undefined || value === true || value === '1'
    }

    setAiShowSetting(show) {
        this.saveData('local_ai_show', show ? '1' : '0')
        return 'ok'
    }

    loadRestrictedModeSetting() {
        let value = this.loadData('local_restricted_mode')
        return !(value === null || value === undefined || value === false || value === '0')
    }

    setRestrictedModeSetting(enabled) {
        this.saveData('local_restricted_mode', enabled ? '1' : '0')
        return 'ok'
    }

    settings = {
        imageQuality: {
            title: "圖片品質",
            type: "select",
            options: [
                { value: 'medium', text: '中' },
                { value: 'large', text: '大' },
                { value: 'original', text: '原圖' },
            ],
            default: 'large',
        },
        imageHost: {
            title: "圖片網域",
            type: "select",
            options: [
                { value: 'i.pximg.net', text: 'i.pximg.net' },
                { value: 'i.pixiv.re', text: 'i.pixiv.re' },
                { value: 'custom', text: '自訂' },
            ],
            default: 'i.pximg.net',
        },
        customImageHost: {
            title: "自訂圖片網域",
            type: "input",
            validator: null,
            default: "",
        },
        refresh_category_data: {
            title: "更新分類資料",
            type: "callback",
            buttonText: "更新",
            callback: async () => {
                if (!this.getUserId()) {
                    UI.showMessage("請先登入")
                    return
                }
                await this.refreshCategoryData()
                UI.showMessage('分類資料已更新')
            },
        },
        ai_show_settings: {
            title: "AI 作品顯示(本機)",
            type: "callback",
            buttonText: "切換",
            callback: async () => {
                let current = this.loadAiShowSetting()
                let index = await UI.showSelectDialog("AI 作品顯示(本機)",
                    ["顯示 AI 作品", "隱藏 AI 作品"], current ? 0 : 1)
                if (index === null || index === undefined) return
                this.setAiShowSetting(index === 0)
                UI.showMessage(index === 0 ? '已顯示 AI 作品' : '已隱藏 AI 作品')
            },
        },
        restricted_mode_settings: {
            title: "瀏覽限制(本機)",
            type: "callback",
            buttonText: "切換",
            callback: async () => {
                let enabled = this.loadRestrictedModeSetting()
                let index = await UI.showSelectDialog("瀏覽限制(本機)",
                    ["顯示 R18", "隱藏 R18"], enabled ? 1 : 0)
                if (index === null || index === undefined) return
                this.setRestrictedModeSetting(index === 1)
                UI.showMessage(index === 1 ? '已顯示 R18' : '已隱藏 R18')
            },
        },
    }

    translation = {
        'zh_CN': {
            '推薦插畫': '推荐插画',
            '推薦漫畫': '推荐漫画',
            '關注新作': '关注新作',
            '日榜': '日榜',
            '週榜': '周榜',
            '月榜': '月榜',
            '新人榜': '新人榜',
            'R18 日榜': 'R18 日榜',
            'R18 週榜': 'R18 周榜',
            '喜歡的標籤': '喜欢的标签',
            '熱門標籤': '热门标签',
            '追蹤標籤': '追踪标签',
            '關注畫師': '关注画师',
            'Pixiv': 'Pixiv',
            'i.pximg.net': 'i.pximg.net',
            'i.pixiv.re': 'i.pixiv.re',
            '排序': '排序',
            '最新': '最新',
            '最早': '最早',
            '熱門': '热门',
            '搜尋範圍': '搜索范围',
            '標籤(部分)': '标签(部分)',
            '標籤(完整)': '标签(完整)',
            '標題與簡介': '标题与简介',
            '公開收藏': '公开收藏',
            '私密收藏': '私密收藏',
            '作者': '作者',
            '標籤': '标签',
            '圖片品質': '图片质量',
            '中': '中',
            '大': '大',
            '原圖': '原图',
            '圖片網域': '图片域名',
            '自訂': '自定义',
            '自訂圖片網域': '自定义图片域名',
            '更新分類資料': '刷新分类数据',
            '更新': '刷新',
            '請先登入': '请先登录',
            '分類資料已更新': '分类数据已更新',
            'AI 作品顯示(本機)': 'AI 作品显示(本地)',
            '切換': '切换',
            '顯示 AI 作品': '显示 AI 作品',
            '隱藏 AI 作品': '隐藏 AI 作品',
            '已顯示 AI 作品': '已显示 AI 作品',
            '已隱藏 AI 作品': '已隐藏 AI 作品',
            '瀏覽限制(本機)': '浏览限制(本地)',
            '顯示 R18': '显示 R18',
            '隱藏 R18': '隐藏 R18',
            '已顯示 R18': '已显示 R18',
            '已隱藏 R18': '已隐藏 R18',
            'PHPSESSID': 'PHPSESSID',
            '其他 Cookie': '其他 Cookie',
            '登入已過期': '登录已过期',
            '刪除收藏失敗': '删除收藏失败',
            '加入收藏失敗': '加入收藏失败',
            '留言失敗': '留言失败',
        },
        'zh_TW': {
            '推薦插畫': '推薦插畫',
            '推薦漫畫': '推薦漫畫',
            '關注新作': '關注新作',
            '日榜': '日榜',
            '週榜': '週榜',
            '月榜': '月榜',
            '新人榜': '新人榜',
            'R18 日榜': 'R18 日榜',
            'R18 週榜': 'R18 週榜',
            '喜歡的標籤': '喜歡的標籤',
            '熱門標籤': '熱門標籤',
            '追蹤標籤': '追蹤標籤',
            '關注畫師': '關注畫師',
            'Pixiv': 'Pixiv',
            'i.pximg.net': 'i.pximg.net',
            'i.pixiv.re': 'i.pixiv.re',
            '排序': '排序',
            '最新': '最新',
            '最早': '最早',
            '熱門': '熱門',
            '搜尋範圍': '搜尋範圍',
            '標籤(部分)': '標籤(部分)',
            '標籤(完整)': '標籤(完整)',
            '標題與簡介': '標題與簡介',
            '公開收藏': '公開收藏',
            '私密收藏': '私密收藏',
            '作者': '作者',
            '標籤': '標籤',
            '圖片品質': '圖片品質',
            '中': '中',
            '大': '大',
            '原圖': '原圖',
            '圖片網域': '圖片網域',
            '自訂': '自訂',
            '自訂圖片網域': '自訂圖片網域',
            '更新分類資料': '更新分類資料',
            '更新': '更新',
            '請先登入': '請先登入',
            '分類資料已更新': '分類資料已更新',
            'AI 作品顯示(本機)': 'AI 作品顯示(本機)',
            '切換': '切換',
            '顯示 AI 作品': '顯示 AI 作品',
            '隱藏 AI 作品': '隱藏 AI 作品',
            '已顯示 AI 作品': '已顯示 AI 作品',
            '已隱藏 AI 作品': '已隱藏 AI 作品',
            '瀏覽限制(本機)': '瀏覽限制(本機)',
            '顯示 R18': '顯示 R18',
            '隱藏 R18': '隱藏 R18',
            '已顯示 R18': '已顯示 R18',
            '已隱藏 R18': '已隱藏 R18',
            'PHPSESSID': 'PHPSESSID',
            '其他 Cookie': '其他 Cookie',
            '登入已過期': '登入已過期',
            '刪除收藏失敗': '刪除收藏失敗',
            '加入收藏失敗': '加入收藏失敗',
            '留言失敗': '留言失敗',
        },
        'en': {
            '推薦插畫': 'Recommended Illustrations',
            '推薦漫畫': 'Recommended Manga',
            '關注新作': 'Following',
            '日榜': 'Daily',
            '週榜': 'Weekly',
            '月榜': 'Monthly',
            '新人榜': 'Rookie',
            'R18 日榜': 'Daily R18',
            'R18 週榜': 'Weekly R18',
            '喜歡的標籤': 'Favorite Tags',
            '熱門標籤': 'Trending Tags',
            '追蹤標籤': 'Tags from Following',
            '關注畫師': 'Following Artists',
            'Pixiv': 'Pixiv',
            'i.pximg.net': 'i.pximg.net',
            'i.pixiv.re': 'i.pixiv.re',
            '排序': 'Sort',
            '最新': 'Newest',
            '最早': 'Oldest',
            '熱門': 'Popular',
            '搜尋範圍': 'Search Target',
            '標籤(部分)': 'Tags (partial)',
            '標籤(完整)': 'Tags (exact)',
            '標題與簡介': 'Title & Caption',
            '公開收藏': 'Public',
            '私密收藏': 'Private',
            '作者': 'Artist',
            '標籤': 'Tags',
            '圖片品質': 'Image Quality',
            '中': 'Medium',
            '大': 'Large',
            '原圖': 'Original',
            '圖片網域': 'Image Host',
            '自訂': 'Custom',
            '自訂圖片網域': 'Custom Image Host',
            '更新分類資料': 'Refresh Category Data',
            '更新': 'Refresh',
            '請先登入': 'Please log in first',
            '分類資料已更新': 'Category data updated',
            'AI 作品顯示(本機)': 'AI Work Display (local)',
            '切換': 'Switch',
            '顯示 AI 作品': 'Show AI Works',
            '隱藏 AI 作品': 'Hide AI Works',
            '已顯示 AI 作品': 'AI Works Shown',
            '已隱藏 AI 作品': 'AI Works Hidden',
            '瀏覽限制(本機)': 'Restricted Mode (local)',
            '顯示 R18': 'Show R18',
            '隱藏 R18': 'Hide R18',
            '已顯示 R18': 'R18 Shown',
            '已隱藏 R18': 'R18 Hidden',
            'PHPSESSID': 'PHPSESSID',
            '其他 Cookie': 'Other cookies',
            '登入已過期': 'Login expired',
            '刪除收藏失敗': 'Failed to delete favorite',
            '加入收藏失敗': 'Failed to add favorite',
            '留言失敗': 'Failed to send comment',
        }
    }
}