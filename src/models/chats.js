const mongoose = require('mongoose');
const util = require('../js/util.js');

const chatSchema = new mongoose.Schema({
    _id: { type: String, default: util.getMongoObjectId },
    conversationId: { type: String, default: util.getCrptoToken },
    senderId: { type: String, required: true },
    message: { type: String, required: true },
    deletedBy: { type: Array, default: [] },
    sendAt: { 
        date: { type: Date, default: Date.now },
        dataTime: { type: String, default: util.current_time },
        timeStamp: { type: Number, default: new Date().getTime() }
    }
});

chatSchema.methods.getMessages = function(criteria = {}, cb) {
    var lookups = [];
    var matchAnd = [{conversationId: this.conversationId}];
    if(criteria.userId) {
        matchAnd.push({deletedBy: {$nin: [criteria.userId]}})
    }
    if(criteria.condition && criteria.condition.length) {
        matchAnd = matchAnd.concat(criteria.condition);
    }
    lookups.push({$match: { $and: matchAnd  } });
    lookups.push({ $sort : {"sendAt.dataTime": -1} });
    if(criteria.offset) {
        var lmt = typeof criteria.limit == 'undefined' ? 20 : parseInt(criteria.limit);
        lmt = parseInt(criteria.offset) + lmt;
        lookups.push({ $limit: parseInt(lmt)});
        lookups.push({ $skip: parseInt(criteria.offset)});
    }
    return this.model('chats').aggregate(lookups, cb);
}

chatSchema.methods.getMessageById = function(cb) {
    return this.model('chats').findById(this._id, cb);
}

chatSchema.methods.deleteMessage = function(userId, messageIds) {

    if(messageIds.length == 0){
        return null;
    }

    var criteria = {
        condition: [
            {_id: {$in: messageIds} }
        ]
    };
    const nullCallBack = (err, result) => {};
    this.getMessages(criteria, (err, messages) => {
        if(messages.length > 0) {
            var accessToDeleteMessageIds = [];
            var accessToUpdateMessageIds = [];
            messages.forEach(message => {
                if(message.deletedBy.length == 1){
                    accessToDeleteMessageIds.push(message._id);
                } else {
                    accessToUpdateMessageIds.push(message._id);
                }
            });
            if(accessToUpdateMessageIds.length > 0) {
                this.model('chats').updateMany( {_id: {$in: accessToUpdateMessageIds}}, {deletedBy: [userId]} ,nullCallBack);
            }
            if(accessToDeleteMessageIds.length > 0) {
                this.model('chats').deleteMany({_id: { $in: accessToDeleteMessageIds }}, nullCallBack);
            }
        }
    });
};

chatSchema.methods.deleteAll = function(userId) {
    const nullCallBack = (err, result) => {};
    this.getMessages({}, (err, messages) => {
        if(messages.length > 0) {
            var accessToDeleteMessageIds = [];
            var accessToUpdateMessageIds = [];
            messages.forEach(message => {
                if(message.deletedBy.length == 1){
                    accessToDeleteMessageIds.push(message._id);
                } else {
                    accessToUpdateMessageIds.push(message._id);
                }
            });
            if(accessToUpdateMessageIds.length > 0) {
                this.model('chats').updateMany( {_id: {$in: accessToUpdateMessageIds}}, {deletedBy: [userId]} ,nullCallBack);
            }
            if(accessToDeleteMessageIds.length > 0) {
                this.model('chats').deleteMany({_id: { $in: accessToDeleteMessageIds }}, nullCallBack);
            }
        }
    });
};

module.exports = mongoose.model('chats', chatSchema);