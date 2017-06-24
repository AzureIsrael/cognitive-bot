var rp = require('request-promise'); //.defaults({ encoding: null });
var guid = require('guid');
var storage = require('azure-storage-simple')(process.env.AZURE_STORAGE_ACCOUNT || process.env.AZURE_STORAGE_CONNECTION_STRING, process.env.AZURE_STORAGE_ACCESS_KEY || null);
var request = require('request');

const headers = {
    'Content-Type': "application/json",
    'Ocp-Apim-Subscription-Key': process.env.FACE_KEY
};

function identifyPerson(buffer, contentType, recognized, unrecognized) {
    uploadPhoto(buffer, contentType)
        .then((blobResult) => {
            var photoUrl = "https://" + process.env.AZURE_STORAGE_ACCOUNT + ".blob.core.windows.net/" + blobResult.container + "/" + blobResult.blob;
            detectFace(photoUrl).then(res => {
                var resParsed = JSON.parse(res);
                if (resParsed.length == 0) {
                    unrecognized();
                    return null;
                }
                var faceId = resParsed[0].faceId;
                identifyFace(faceId)
                    .then(res => {
                        var candidates = JSON.parse(res)[0].candidates;
                        if (candidates.length == 0) {
                            unrecognized();
                            return;
                        }
                        var personId = candidates[0].personId;
                        getPerson(personId)
                            .then(res => {
                                var name = JSON.parse(res).name;
                                recognized(name);
                                return null;
                            }).catch(function(err) {
                                console.log(err);
                            });
                        return null;
                    }).catch(function(err) {
                        console.log(err);
                    });
                return null;

            }).catch(function(err) {
                console.log(err);
            });

            return null;
        })
        .catch((error) => {
            console.log(error)
        });;
}

function uploadPhoto(buffer, contentType) {
    var blob = storage.blob('facetodetect', { publicAccessLevel: 'blob' });
    return blob.write(guid.raw(), { contentType: 'image/png' }, buffer)
}

function detectFace(photoUrl) {
    var options = {
        uri: process.env.FACE_API_ENDPOINT + '/detect',
        method: "POST",
        headers,
        body: JSON.stringify({ "url": photoUrl }),
        //json: true
    };
    return rp(options);
}

function identifyFace(faceId) {
    const options = {
        uri: process.env.FACE_API_ENDPOINT + "/identify",
        method: "POST",
        headers,
        body: JSON.stringify({
            "personGroupId": process.env.PERSON_GROUP_ID,
            "faceIds": [faceId],
            "maxNumOfCandidatesReturned": 1,
            "confidenceThreshold": 0.5
        })
    };
    return rp(options);
}

function getPerson(personId) {
    const options = {
        uri: process.env.FACE_API_ENDPOINT + "/persongroups/" + process.env.PERSON_GROUP_ID + "/persons/" + personId,
        method: "GET",
        headers
    };
    return rp(options);
}

module.exports = {
    identifyPerson
}