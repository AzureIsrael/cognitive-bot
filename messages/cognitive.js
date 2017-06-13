var request = require('request-promise').defaults({
    encoding: null
});;
var translator = require("./translator");
let cognitivekey = process.env.COGNITIVE_KEY;
let uri = "https://westeurope.api.cognitive.microsoft.com/vision/v1.0/";
const headers = {
    'Content-Type': "application/octet-stream",
    'Ocp-Apim-Subscription-Key': cognitivekey
};

function imagedescription(stream, language, cb) {
    let descriptionuri = uri + "describe";
    const options = {
        uri: descriptionuri,
        method: "POST",
        headers,
        json: true,
        formData: {
            body: stream
        }
    };
    var result = request(options);
    result.then(res => {
        var caption = res.description.captions[0].text;
        translator.query(caption, "en", language, function(data) {
            cb(data);
        });
    }).catch(function(err) {
        // Crawling failed or Cheerio choked...
        console.log(err);
    });
}

function handwriting(stream, language, cb) {
    let handwritinguri = uri + "ocr";
    const options = {
        uri: handwritinguri,
        headers,
        json: true,
        method: "POST",
        formData: {
            body: stream
        }

    };
    var result = request(options);
    result.then((res) => {
        cb(extractText(res.regions));
    });


}

function extractText(regions) {
    let output = '';
    regions.forEach(region => {
        region.lines.forEach(line => {
            line.words.forEach(word => {
                output += word.text + " ";
            });
        });
    });

    return output;
}

module.exports = {
    imagedescription,
    handwriting
}