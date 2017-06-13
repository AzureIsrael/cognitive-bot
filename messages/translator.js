var MsTranslator = require('mstranslator');
var request = require('request-promise');
const crypto = require('crypto')

const LANGUAGES = 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/languages'
let languagekey = process.env.LANGUAGE_KEY;
let translatekey = process.env.TRANSLATE_KEY;


var client = new MsTranslator({
    api_key: translatekey
}, true);

function getlanguage(text, cb) {

    const documents = processDocuments(text);

    const options = {
        url: LANGUAGES,
        method: 'POST',
        body: JSON.stringify({ documents }),
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': languagekey,
        }
    }
    request(options, (err, res, body) => {
        let result = JSON.parse(body);
        cb(result.documents[0].detectedLanguages[0].iso6391Name, result.documents[0].detectedLanguages[0].name);

    });
}

function processDocuments(rawDocuments) {
    return ([rawDocuments])
        .map(doc => ({
            text: doc,
            id: crypto.randomBytes(8).toString('hex'),
            language: 'en',
        }));
}

function query(text, language, tolanguage, cb) {
    var params = {
        text: text
        , from: language
        , to: tolanguage
    };
    client.translate(params, (err, data) => {
        cb(data);
    });
}

module.exports = {
    query,
    getlanguage
}