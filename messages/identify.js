var request = require('request-promise').defaults({
    encoding: null
});
var azure = require('azure-storage');
var guid = require('guid');
var streamBuffers = require('stream-buffers');

const headers = {
    'Content-Type': "application/octet-stream",
    'Ocp-Apim-Subscription-Key': process.env.FACE_KEY
};

function identifyPerson(buffer, contentType, cb) {
    uploadPhoto(buffer, contentType);
}

function uploadPhoto(buffer, contentType) {
    var account = process.env.AZURE_STORAGE_ACCOUNT;
    var key = process.env.AZURE_STORAGE_ACCESS_KEY;
    var cs = process.env.AZURE_STORAGE_CONNECTION_STRING;

    var storage = require('azure-storage-simple')(account || cs, key || null);
    var blob = storage.blob('facetodetect', { publicAccessLevel: 'blob' });
    blob.write(guid.raw(), { contentType: 'image/png' }, buffer)
        .then((x) => { console.log(x) })
        .catch((x) => { console.log(x) });
}

function detectFace(photoUrl) {

}

function identifyFace(faceId) {

}

function getPerson(personId) {

}

module.exports = {
    identifyPerson
}