"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var Promise = require('bluebird');
var request = require('request-promise').defaults({
    encoding: null
});

var telemetryModule = require('./telemetry.js');
require('dotenv').config();
var translator = require("./translator");
var cognitive = require("./cognitive");
var appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
var appInsightsClient = appInsights.getClient();

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

bot.dialog('/', [
    (session, args, next) => {
        translator.getlanguage(session.message.text, (language, longname) => {
            session.privateConversationData.language = language;

            session.send('Detected: ' + longname);
            translator.query(session.message.text, session.privateConversationData.language, "en", function(data) {
                session.send(data);
                session.beginDialog("afterlanguagedetect");
            });
        });
    }
]);


bot.dialog('afterlanguagedetect', [
    (session, args, next) => {
        session.preferredLocale(session.privateConversationData.language, (err) => {
            var telemetry = telemetryModule.createTelemetry(session);

            appInsightsClient.trackEvent('Language', telemetry);

            var options = session.localizer.gettext(session.preferredLocale(), "options");
            builder.Prompts.choice(session, "option-select", options, {
                listStyle: builder.ListStyle.list
            });
        });
    },
    (session, args, next) => {
        session.privateConversationData.action = args.response.index;
        builder.Prompts.attachment(session, "detection");
    },
    (session, args, next) => {
        var msg = session.message;
        if (msg.attachments.length) {
            // Message with attachment, proceed to download it.
            // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
            var attachment = msg.attachments[0];
            session.sendTyping();
            var fileDownload = request(attachment.contentUrl);

            fileDownload.then(
                function(response) {
                    switch (session.privateConversationData.action) {
                        case 0:
                            {
                                cognitive.imagedescription(response, session.privateConversationData.language, (data) => {
                                    session.send(data);
                                    session.replaceDialog("afterlanguagedetect");
                                });
                            }
                            break;
                        case 1:
                            {
                                cognitive.handwriting(response, session.privateConversationData.language, (data) => {
                                    session.send(data);
                                    session.replaceDialog("afterlanguagedetect");
                                });
                            }
                            break;
                    }

                });
        } else {
            session.replaceDialog("afterlanguagedetect");
        }
    }
]);


if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() }
}