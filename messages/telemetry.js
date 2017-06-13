exports.createTelemetry = function (session) {
    var data = {
        conversationData: JSON.stringify(session.conversationData),
        privateConversationData: JSON.stringify(session.privateConversationData),
        userData: JSON.stringify(session.userData),
        conversationId: session.message.address.conversation.id,
        userId: session.message.address.user.id
    };

    return data;
};