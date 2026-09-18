// Input: texts (string[]), sourceLang, targetLang, glossary, provider.
// Output: {texts: string[], glossary?: {source: translation}}.
// Keep exactly one translation per input, in the same order.
async function translate({ texts, sourceLang, targetLang, glossary, provider }) {

    function worker(text) {
        const params = {
            "params.client": "gtx",
            "dataTypes": "TRANSLATION",
            "key": "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA",
            "query.sourceLanguage": sourceLang,
            "query.targetLanguage": targetLang,
            "query.text": text,
        };

        const url = "https://translate-pa.googleapis.com/v1/translate?"
            + Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&");

        return Network.sendRequest("GET", url);
    };

    const translatedTexts = await Promise.all(
        texts.map(async text => {
            const response = await worker(text);

            if (response.status !== 200) return text;

            const data = JSON.parse(response.body);
            return data.translation;
        })
    );

    return { texts: translatedTexts };
}