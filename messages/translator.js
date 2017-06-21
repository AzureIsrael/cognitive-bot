var MsTranslator = require('mstranslator');
var request = require('request-promise');
const crypto = require('crypto')


var client = new MsTranslator({
    api_key: process.env.TRANSLATE_KEY
}, true);

function getlanguage(text, cb, error) {

    const documents = processDocuments(text);

    const options = {
        url: process.env.TEXT_ANALYTICS_API_ENDPOINT + '/languages',
        method: 'POST',
        body: JSON.stringify({ documents }),
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': process.env.TEXT_ANALYTICS_KEY,
        }
    }
    request(options, (err, res, body) => {
        let result = JSON.parse(body);
        if (!result.statusCode) {
            cb(result.documents[0].detectedLanguages[0].iso6391Name, result.documents[0].detectedLanguages[0].name);
        } else {
            error(result);
        }

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
        text: text,
        from: language,
        to: tolanguage
    };
    client.translate(params, (err, data) => {
        cb(data);
    });
}

module.exports = {
    query,
    getlanguage
}