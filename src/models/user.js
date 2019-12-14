const mongoose = require('mongoose');
const util = require('../js/util.js');
const userSchema = new mongoose.Schema({
	_id: { type: String, default: util.getMongoObjectId },
	firstName: { type: String, required: true },
	lastName: String,
	emailId: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'invalid email address']
    },
    mobileNumber: {
    	type: String,
    	trim: true,
    	unique: true,
        required: true,
    	validate: [(num) => {
    		return /^[0-9]+$/.test(num);
    	}, 'invalid mobile number']
    },
    password: { salt: String,  hash: String },
    gender: { type: String, default: 'm' },
    age: Number,
    userType: { type: String, required: true },
    isActivated: { type: Boolean, required: true },
    chatConversations: { type: Array, default:[] },
    avatar: { type: String, default: 'Avatar.jpg' },
    verificationMail: mongoose.Schema.Types.Mixed,
    accessToken: { type: Array, default: [] },
    likes: { type: Array, default: [] },
    unlikes: { type: Array, default: [] },
    location: { 
        address: String,
        lat: mongoose.Schema.Types.Decimal128,
        lng: mongoose.Schema.Types.Decimal128
    },
    createdAt: { type: String, default: util.current_time }
});

userSchema.methods.validateToken = function(cb) {
	return this.model('users').find(
        {accessToken: {$all: this.accessToken}, isDeleted: {$ne: 1}},
        { password: 0, verificationMail : 0 , accessToken : 0 },
        (err, data) => {
		cb(data.length > 0 ? data[0] : false);
	});
};

userSchema.methods.checkExistUser = function(cb) {
    return this.model('users').find({emailId: this.emailId, isDeleted: {$ne: 1}}, (err, data) => {
		cb(data.length > 0);
	});
}

userSchema.methods.updateUser = function(wh, updateData, cb) {
    return this.model('users').updateMany(wh, { $set: updateData }, { runValidators: true }, cb);
}

userSchema.methods.getUsers = function(criteria = {}, cb) {
    var lookups = [];
    if(criteria.condition && criteria.condition.length) {
        lookups.push({ $match: { $and: criteria.condition } });
    }
    lookups.push(util.userProjection);
    lookups.push({ $sort : {createdAt: criteria.isRecent ? -1 : 1} });
    if(criteria.offset) {
		var lmt = typeof criteria.limit == 'undefined' ? 10 : parseInt(criteria.limit);
		lmt = parseInt(criteria.offset) + lmt;
		lookups.push({ $limit: parseInt(lmt)});
		lookups.push({ $skip: parseInt(criteria.offset)});
	}
    return this.model('users').aggregate(lookups, cb);  
};

userSchema.methods.getUserById = function(cb) {
    return this.model('users').findById(this._id, cb);
}

userSchema.methods.getNearByUsers = function(criteria = {}, cb) {
    var interacted = [this._id];
    if(this.likes)
        interacted = interacted.concat(this.likes);
    if(this.unlikes)
        interacted = interacted.concat(this.unlikes);

    var matchAnd = [];
    matchAnd.push({_id: { $nin: interacted}});
    if(criteria.distance && criteria.location) {
        var km = parseInt(criteria.distance);
        if(criteria.distType && criteria.distType == 'mi')
            km = km * 1.60934; /* km * mi*/
        var distance = (km * 0.1) / 11;
        var LatN = parseFloat(criteria.location.lat) + distance;
        var LatS = parseFloat(criteria.location.lat) - distance;
        var LonE = parseFloat(criteria.location.lng) + distance;
        var LonW = parseFloat(criteria.location.lng) - distance;	

        matchAnd.push({
            $and: [
                {'location.lat': { $lte: LatN}},
                {'location.lat': { $gte: LatS}},
                {'location.lng': { $lte: LonE}},
                {'location.lng': { $gte: LonW}}
            ]
        });
    }
    if(criteria.gender){
        matchAnd.push({gender: criteria.gender});
    }
    if(criteria.age && criteria.age.length == 2) {
        matchAnd.push({
            $and: [ 
                {'age': {$gte: criteria.age[0]}},
                {'age': {$lte: criteria.age[1]}}
            ]
        });
    }
    criteria.condition = matchAnd;
    return this.getUsers(criteria, cb);
}

userSchema.methods.checkIsMatched = function (userId, cb) {
    var condition = {
        $or: [
            {
                $and: [
                    { _id: this._id },
                    { likes: {$all: [userId]} }
                ]
            },
            {
                $and: [
                    { _id: userId },
                    { likes: {$all: [this._id]} }
                ]
            }
        ]
    };
    return this.model('users').find(condition, (err, users) => {
        cb(users.length == 2);
    });
}

userSchema.methods.getConversationId = function(userId, cb){
    return this.model('users').findById(userId, (err, user) => {
        var conversationId = '';
        if(user && user.chatConversations && this.chatConversations){
            user.chatConversations.forEach((value) => {
                if(this.chatConversations.indexOf(value) > -1)
                    conversationId = value;
            });
        }
        cb(conversationId);
    });
}

module.exports = mongoose.model('users', userSchema);