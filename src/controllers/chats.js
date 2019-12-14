const util = require('../js/util.js');
var config = require('../config/index.js');
const ChatModel = require('../models/chats.js');
const UserModel = require('../models/user.js');

module.exports = class ChatController {

    sendMessage(req, res) {
        if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
            res.json(util.getResponses('005', {}));
            return;
        }

        if(!req.body.userId || !req.body.message){
            res.json(util.getResponses('003', {}));
            return;
        }
        const userId = req.body.userId;
        req.accessUser.checkIsMatched(userId, (isMatched) => {
            if(isMatched) {
                req.accessUser.getConversationId(userId, (conversationId) => {
                    const currentTime = util.current_time();
                    var chatData = {
                        senderId: req.accessUser._id,
                        message: req.body.message,
                        sendAt: {
                            date: new Date(currentTime),
                            dataTime: currentTime,
                            timeStamp: new Date(currentTime).getTime()
                        }
                    };
                    if(conversationId != ''){
                        chatData.conversationId = conversationId;
                    }
                    const newChat = new ChatModel(chatData);
                    if(conversationId == ''){
                        UserModel.updateMany(
                            {_id: {$in: [req.accessUser._id, userId]}},
                            {$push: {chatConversations: newChat.conversationId}},
                            (err, result) => {}
                        );
                    }
                    const err = newChat.validateSync();
                    if(err) {
                        res.json(util.getResponses('003', {message: 'schema error', error: err}));
                        return;
                    } 
                    newChat.save();
                    res.json(util.getResponses('020', {conversationId: newChat.conversationId}));
                });
            } else {
                res.json(util.getResponses('046', {}));
            }
        });
    }

    getMessages(req, res) {
        if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
            res.json(util.getResponses('005', {}));
            return;
        }

        if(!req.body.userId){
            res.json(util.getResponses('003', {}));
            return;
        }
        const userId = req.body.userId;
        if(req.accessUser._id == userId){
            res.json(util.getResponses('020', {messages: []}));
            return;
        }
        req.accessUser.getConversationId(userId, (conversationId) => {
            if( conversationId != '' ) {
                var chat = new ChatModel({conversationId: conversationId});
                const passField = ['offset', 'limit'];
                var criteria = util.getPassFields(passField, req.body);
                criteria.userId = req.accessUser._id;
                chat.getMessages(criteria, (err, data) => {
                    res.json(util.getResponses('020', {messages: data, conversationId}));
                });
            }  else {
                res.json(util.getResponses('045', {}));
            }
        });
    }

    deleteMessage(req, res) {
        if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
            res.json(util.getResponses('005', {}));
            return;
        }

        if(!req.body.conversationId || !req.body.messageIds || !req.body.messageIds.length){
            res.json(util.getResponses('003', {}));
            return;
        }
        const chatConversations = (req.accessUser.chatConversations && req.accessUser.chatConversations.length)
            ? req.accessUser.chatConversations : [];
        const messageIds = req.body.messageIds;
        const conversationId = req.body.conversationId;
        if(chatConversations.indexOf(conversationId) > -1) {
            var chat = new ChatModel({conversationId: conversationId});
            chat.deleteMessage(req.accessUser._id, messageIds);
            res.json(util.getResponses('020', {}));
        } else {
            res.json(util.getResponses('037', {}));
        }
    }

    deleteAllMessage(req, res) {
        if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
            res.json(util.getResponses('005', {}));
            return;
        }

        if(!req.body.conversationId){
            res.json(util.getResponses('003', {}));
            return;
        }
        const chatConversations = (req.accessUser.chatConversations && req.accessUser.chatConversations.length)
            ? req.accessUser.chatConversations : [];
        const conversationId = req.body.conversationId;
        if(chatConversations.indexOf(conversationId) > -1) {
            var chat = new ChatModel({conversationId: conversationId});
            chat.deleteAll(req.accessUser._id);
            res.json(util.getResponses('020', {}));
        } else {
            res.json(util.getResponses('037', {}));
        }
    }

}