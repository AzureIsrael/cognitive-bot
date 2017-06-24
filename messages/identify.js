var rp = require('request-promise'); //.defaults({ encoding: null });
var guid = require('guid');
var storage = require('azure-storage-simple')(process.env.AZURE_STORAGE_ACCOUNT || process.env.AZURE_STORAGE_CONNECTION_STRING, process.env.AZURE_STORAGE_ACCESS_KEY || null);
var request = require('request');

const headers = {
    'Content-Type': "application/octet-stream",
    'Ocp-Apim-Subscription-Key': process.env.FACE_KEY
};

function identifyPerson(buffer, contentType, cb) {
    uploadPhoto(buffer, contentType)
        .then((blobResult) => {
            var photoUrl = "https://" + process.env.AZURE_STORAGE_ACCOUNT + ".blob.core.windows.net/" + blobResult.container + "/" + blobResult.blob;
            cb(photoUrl);
            /*
            detectFace(photoUrl).then(res => {
                var faceId = res[0].faceId;
                identifyFace(faceId)
                    .then(res => {
                        var personId = res[0].candidates[0].personId;
                        getPerson(personId)
                            .then(res => {
                                var name = res.name;
                                cb(name);
                            }).catch(function(err) {
                                console.log(err);
                            });
                    }).catch(function(err) {
                        console.log(err);
                    });
            }).catch(function(err) {
                console.log(err);
            });*/
        })
        .catch((error) => { console.log(error) });;
}

function uploadPhoto(buffer, contentType) {
    var blob = storage.blob('facetodetect', { publicAccessLevel: 'blob' });
    return blob.write(guid.raw(), { contentType: 'image/png' }, buffer)
}

function detectFace(photoUrl) {
    var options = {
        uri: 'https://westeurope.api.cognitive.microsoft.com/face/v1.0/detect',
        method: "POST",
        headers,
        body: JSON.stringify({ "url": photoUrl })
    };
    rp(options)
        .then(res => {
            var faceId = res[0].faceId;
        })
        .catch(function(err) {
            // Crawling failed or Cheerio choked...
            console.log(err.message);
        });
}

function identifyFace(faceId) {
    const options = {
        uri: process.env.FACE_API_ENDPOINT + "/identify",
        method: "POST",
        headers,
        json: true,
        formData: {
            body: {
                "personGroupId": process.env.PERSON_GROUP_ID,
                "faceIds": [faceId],
                "maxNumOfCandidatesReturned": 1,
                "confidenceThreshold": 0.5
            }
        }
    };
    return rp(options);
}

function getPerson(personId) {
    const options = {
        uri: process.env.FACE_API_ENDPOINT + "/persongroups/" + process.emit.PERSON_GROUP_ID + "/persons/" + personId,
        method: "GET",
        headers,
        json: true
    };
    return rp(options);
}

module.exports = {
    identifyPerson,
    detectFace
}