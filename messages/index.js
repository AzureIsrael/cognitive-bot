"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var Promise = require('bluebird');
var request = require('request-promise').defaults({
    encoding: null
});

var telemetryModule = require('./telemetry.js');
var translator = require("./translator");
var cognitive = require("./cognitive");
var identify = require("./identify");

var appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
var appInsightsClient = appInsights.getClient();

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
}) : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

bot.dialog('/', [
    (session, args, next) => {
        translator.getlanguage(session.message.text, (language, longname) => {
            session.privateConversationData.language = language;
            session.send(longname + ' detected');
            session.preferredLocale(language, function(err) {
                if (!err) {
                    // Locale files loaded
                    var telemetry = telemetryModule.createTelemetry(session);
                    appInsightsClient.trackEvent('Language', telemetry);
                } else {
                    // Problem loading the selected locale
                    session.error(err);
                }
            });
            translator.query(session.message.text, language, "en", function(data) {
                session.send(data);
                session.beginDialog("identifyPersonDialog");
            });
        }, (err) => {
            console.log(err);
        });
    }
]);


bot.dialog('identifyPersonDialog', [

    (session, args, next) => {
        // ask user to upload image for identification
        builder.Prompts.attachment(session, "please-identify");
    },
    (session, args, next) => {
        var self = this;
        var msg = session.message;
        if (msg.attachments.length) {
            // Message with attachment, proceed to download it.
            // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
            var attachment = msg.attachments[0];
            session.sendTyping();
            var fileDownload = request(attachment.contentUrl);
            self.contentType = attachment.contentType;

            fileDownload.then(
                function(response) {
                    identify.identifyPerson(response, self.contentType, (personName) => {
                        session.send(session.localizer.gettext(session.preferredLocale(),
                            "welcome-back") + ' ' + personName);
                        var telemetry = telemetryModule.createTelemetry(session);
                        appInsightsClient.trackEvent('SignIn', telemetry);
                        session.replaceDialog("chooseCognitiveServiceDialog");
                    }, () => {
                        session.send(session.localizer.gettext(session.preferredLocale(),
                            "unrecognized-person"));
                        session.replaceDialog("identifyPersonDialog");

                    });
                });
        } else {
            session.replaceDialog("identifyPersonDialog");
        }
    }
]);

bot.dialog('chooseCognitiveServiceDialog', [
    (session, args, next) => {
        var options = session.localizer.gettext(session.preferredLocale(), "options");
        builder.Prompts.choice(session, "option-select", options, {
            listStyle: builder.ListStyle.list
        });
    },
    (session, args, next) => {
        if (args.response.index == 2) {
            session.send(session.localizer.gettext(session.preferredLocale(), "sign-off"));
            var telemetry = telemetryModule.createTelemetry(session);
            appInsightsClient.trackEvent('SignOff', telemetry);
            session.replaceDialog("identifyPersonDialog");
        } else {
            // store user choice in session
            session.privateConversationData.action = args.response.index;
            // ask user to upload image for ocr/description
            builder.Prompts.attachment(session, "detection");
        }
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
                                cognitive.describeImage(response, session.privateConversationData.language, (data) => {
                                    session.send(data);
                                    var telemetry = telemetryModule.createTelemetry(session);
                                    appInsightsClient.trackEvent('ImageDescription', telemetry);
                                    session.replaceDialog("chooseCognitiveServiceDialog");
                                });
                            }
                            break;
                        case 1:
                            {
                                cognitive.ocr(response, session.privateConversationData.language, (data) => {
                                    if (data.length > 0) {
                                        session.send(data);
                                    } else {
                                        session.send(session.localizer.gettext(session.preferredLocale(), "ocr-text-not-found"));
                                    }
                                    var telemetry = telemetryModule.createTelemetry(session);
                                    appInsightsClient.trackEvent('OCR', telemetry);
                                    session.replaceDialog("chooseCognitiveServiceDialog");
                                });
                            }
                            break;
                    }

                });
        } else {
            session.replaceDialog("chooseCognitiveServiceDialog");
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