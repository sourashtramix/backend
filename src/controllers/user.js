var common = require('../js/util.js');
var ObjectId = require('mongodb').ObjectId;
var config = require('../config/index.js');
var path = require('path');
const fs = require('fs');
var http = require('http'),                                                
Stream = require('stream').Transform;
const UserModel = require('../models/user.js');

class UserController {
	self = this;
	auth(){
		return function(req, res, next){

			if(req.headers.hasOwnProperty('token')){

				var token = req.headers.token;
				const user = new UserModel({ accessToken: [token] }); 

				user.validateToken(accessUser => {
					if(accessUser) {
						req.accessToken = token;
						req.accessUser = accessUser;
						next();
					}
					else
						res.json(common.getResponses('005', {}));
				});

			}else
				next();
		};
	}

	saveAvatar(url, targetPath) {                  
		try {
			http.request(url, function(response) {                                        
				var data = new Stream();                                                    
		
				response.on('data', function(chunk) {                                       
					data.push(chunk);                                                         
				});                                                                         
		
				response.on('end', function() {                                             
					fs.writeFileSync(targetPath, data.read());                               
				});                                                                         
			}).end();
		} catch (e) {}
	}

	uploadFileByBase64(enCodeData, dirPath, fileName, cb){
		try {
			function decodeBase64Image(dataString) {
				var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
				var response = {};
	
				if (matches.length !== 3) {
					cb(true, {message: 'Invalid input string'});
				}
	
				response.type = matches[1];
				response.data = new Buffer.from(matches[2], 'base64');
	
				return response;
			}
			var imageTypeRegularExpression = /\/(.*?)$/;
			var imageBuffer = decodeBase64Image(enCodeData);
			var imageTypeDetected = imageBuffer.type.match(imageTypeRegularExpression);
			var fullFileName = 'dvs_' + fileName +
								'.' + imageTypeDetected[1];
			var targetPath = dirPath + fullFileName;
			try {
				if (fs.existsSync(targetPath))
					fs.unlinkSync(targetPath);
				fs.writeFile(targetPath, imageBuffer.data, () => {
					cb(false, {message: 'success', fileName: fullFileName});
				});
			}
			catch(error) {
				cb(true, {message: 'Exception Catched', err: error});
			}
	
		}
		catch(error) {
			cb(true, {message: 'Exception Catched', err: error});
		}
	}

	uploadAvatar = (req, res, _id, cb) => {
		var avatarExt = '';
		var avatarFileName = '';
		var avatarTargetPath = '';
		var avatarDir = './src/uploads/avatars/';
		if(typeof req.file != 'undefined'){
			if(typeof req.file.path != 'undefined'){
				var removeUpload = function(){
					if (fs.existsSync(req.file.path))
						fs.unlinkSync(req.file.path);
				};
				try {
					if (!fs.existsSync(avatarDir))
						fs.mkdirSync(avatarDir);
				} catch (err) {
					removeUpload();
					res.json(common.getResponses('035', {}));
					return;
				}
	
				if(typeof req.fileError != 'undefined'){
					removeUpload();
					res.json(common.getResponses(req.fileError, {}));
					return;
				}
	
				var avatarExt = path.extname(req.file.path);
				avatarFileName = 'dvs_' + _id + avatarExt;
				avatarTargetPath = avatarDir + avatarFileName;
				try {
					if (fs.existsSync(avatarTargetPath))
						fs.unlinkSync(avatarTargetPath);
					   fs.renameSync(req.file.path, avatarTargetPath);
					   cb(avatarFileName);
					   return; 		
				   } catch (err) {
					   res.json(common.getResponses('035', {}));
					return;
				   }
			}
		}
		cb(avatarFileName);
	}

};

UserController.prototype.Get_Me = (req, res) => {
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}
	var token = req.accessToken;
	var user = req.accessUser;
	if(user.hasOwnProperty('avatar'))
		user.avatar = config.liveUrl + 'image/avatars/' + user.avatar;
	if(user.hasOwnProperty('DOB')){
		var dob = user.DOB.split('-');
		if(dob.length > 2)
			user.DOB = dob[2] + '/' + dob[1] + '/' + dob[0];
	}
	// user.password = '';
	// user.accessToken = '';
	// user.verificationMail = '';
	var syncCount = 0, actualCount = 0;	

	var sendResponse = (user) => {

		if(actualCount != syncCount)
			return;

		res.json(common.getResponses('020', user));
	};
	sendResponse(user);
};

UserController.prototype.checkExistUser = (req, res) => {
	if(!req.body.emailId) {
		res.json(common.getResponses('003', {}));
		return;
	}
	
	const user = new UserModel({ emailId: req.body.emailId });
	user.checkExistUser((isUserExist) => {
		res.json(common.getResponses('020', {isUserExist}));
	});
}

UserController.prototype.OAuthSignin = function(req, res) {

	var self = new UserController();
	if((!req.body.emailId &&
		!req.body.mobileNumber)){
		res.json(common.getResponses('003', {}));
		return;
	}

	var emailId = req.body.emailId ? req.body.emailId : '';
	var mobileNumber = req.body.mobileNumber ? req.body.mobileNumber : '';
	var token = common.getCrptoToken(32);
	var $or = [];
	if(typeof req.body.emailId != 'undefined')
	    $or.push({emailId: emailId});
	if(typeof req.body.mobileNumber != 'undefined')
	    $or.push({mobileNumber: mobileNumber});
	var cond = {
		$and: [				
			{$or: $or},
			{isDeleted: {$ne: 1}}
		]
	};
	UserModel.find(cond, (err, data) => {
		if(data && data.length > 0){
			data = data[0];			
			var tokens = (data.accessToken && data.accessToken.length) ? data.accessToken : [];
			tokens.push(token);
			UserModel.updateOne({_id: data._id}, {accessToken: tokens}, (err, result) => {
				res.json(common.getResponses('020', {accessToken: token}));
			});
		}else{

			if(!req.body.firstName){
				res.json(common.getResponses('003', {}));
				return;
			}
			var newUser = {
				_id: common.getMongoObjectId(),
				firstName: req.body.firstName,
				lastName: req.body.lastName ? req.body.lastName : '',
				emailId: emailId,
				mobileNumber: mobileNumber,
				gender: req.body.gender ? req.body.gender : 'm',
				age: req.body.age ? parseInt(req.body.age) : 0,
				userType: 'user',
				isActivated: true,
				accessToken: [token],
				chatConversations: [],
				location: {
					address: req.body.address ? req.body.address : '',
					lat: req.body.latitude ? parseFloat(req.body.latitude) : 0,
					lng: req.body.longitude ? parseFloat(req.body.longitude) : 0,
				}
			};
			if(typeof req.body.photoUrl == 'string'){
				newUser.avatar = 'dvs_' + newUser._id;
				self.saveAvatar(req.body.photoUrl, './src/uploads/avatars/' + newUser.avatar);
			}
			self.uploadAvatar(req, res, newUser._id, fileName => {
				newUser.avatar = fileName;
				const user = new UserModel(newUser);
				const err = user.validateSync();
				if(err) {
					res.json(common.getResponses('003', {message: 'schema error', error: err}));
					return;
				} 
				user.save();
				res.json(common.getResponses('020', {accessToken: token}));
			});
		}
	});

};

UserController.prototype.updateUser = function(req, res) {
	var self = new UserController();
	if(!req.hasOwnProperty('accessToken') ||
		!req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	const passField = ['firstName', 'lastName', 'emailId', 'mobileNumber', 'gender', 'age'];
	var UPD = common.getPassFields(passField, req.body);
	if(req.body.address || req.body.latitude || req.body.longitude) {
		UPD.location = {
			address: req.body.address ? req.body.address : '',
			lat: req.body.latitude ? parseFloat(req.body.latitude) : 0,
			lng: req.body.longitude ? parseFloat(req.body.longitude) : 0,
		};
	}
	var resp = {avatarDir: config.liveUrl + 'image/avatars/'};
	var avatarExt = avatarFileName = avatarTargetPath = '';
	var avatarDir = './src/uploads/avatars/';
	var afterTrigger = function(resp, UPD){
		UserModel.updateOne({_id: req.accessUser._id}, UPD, (err, result) => {
			res.json(common.getResponses('020', {}));
		});
	};

	if(typeof req.file != 'undefined'){
		if(typeof req.file.path != 'undefined'){
			var removeUpload = function(){
				if (fs.existsSync(req.file.path))
					fs.unlinkSync(req.file.path);
			};
			try {
				if (!fs.existsSync(avatarDir))
				    fs.mkdirSync(avatarDir);
			} catch (err) {
				removeUpload();
				res.json(common.getResponses('035', {}));
				return;
			}

			if(typeof req.fileError != 'undefined'){
				removeUpload();
				res.json(common.getResponses(req.fileError, {}));
				return;
			}

			var avatarExt = path.extname(req.file.path);
			avatarFileName = 'dvs_' + req.accessUser._id + avatarExt;
			avatarTargetPath = avatarDir + avatarFileName;
			UPD.avatar = avatarFileName;
			try {
				if (fs.existsSync(avatarTargetPath))
					fs.unlinkSync(avatarTargetPath);
				resp.result = {message: 'binary ok'};
	       		fs.renameSync(req.file.path, avatarTargetPath);
	       		afterTrigger(resp, UPD);
	       	} catch (err) {
	       		res.json(common.getResponses('035', {}));
				return;
	       	}
	    }
	}
	else if(req.body.photoUrl){
		self.uploadFileByBase64(req.body.photoUrl, avatarDir,
			req.accessUser._id, (err, result) => {			
			if(!err){
				UPD.avatar = result.fileName;
				resp.fileResult = result;
			}

			afterTrigger(resp, UPD);
		});
	}else
		afterTrigger(resp, UPD);
};

UserController.prototype.logOut = function(req, res){
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	var data = req.accessUser;
	var tokens = (data.accessToken && data.accessToken.length) ? data.accessToken : [];
	tokens.splice(tokens.indexOf(req.accessToken), 1);
	UserModel.updateOne({_id: data._id}, {accessToken: tokens}, (err, result) => {
		res.json(common.getResponses('020', {accessToken: req.accessToken}));
	});
};

UserController.prototype.getNearByUsers = (req, res) => {
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}
	const passField = ['distance', 'location', 'gender', 'age', 'offset', 'limit','isRecent'];
	var criteria = common.getPassFields(passField, req.body);
	req.accessUser.getNearByUsers(criteria, (err, data) => {
		res.json(common.getResponses('020', data));
	});
}

UserController.prototype.hitLike = (req, res) => {
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	if(!req.body.userId) {
		res.json(common.getResponses('003', {}));
		return;
	}
	const userId = req.body.userId;
	var likes = (req.accessUser.likes && req.accessUser.likes.length) ? req.accessUser.likes : [];
	var unLikes = (req.accessUser.unlikes && req.accessUser.unlikes.length) ? req.accessUser.unlikes : [];
	var unlikedIndex = unLikes.indexOf(userId);
	if(unlikedIndex > -1){
		unLikes.splice(unlikedIndex, 1);
	}
	likes.push(userId);
	UserModel.updateOne({_id: req.accessUser._id}, {likes: likes, unlikes: unLikes}, (err, result) => {
		UserModel.find({_id: userId, likes: {$all: [req.accessUser._id]}}, (err, users) => {
			res.json(common.getResponses('020', {isMatched: users.length > 0}));
		});
	});
};

UserController.prototype.hitUnLike = (req, res) => {
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	if(!req.body.userId) {
		res.json(common.getResponses('003', {}));
		return;
	}

	const userId = req.body.userId;
	var unLikes = (req.accessUser.unlikes && req.accessUser.unlikes.length) ? req.accessUser.unlikes : [];
	var likes = (req.accessUser.likes && req.accessUser.likes.length) ? req.accessUser.likes : [];
	var likedIndex = likes.indexOf(userId);
	if(likedIndex > -1){
		likes.splice(likedIndex, 1);
	}
	unLikes.push(userId);
	UserModel.updateOne({_id: req.accessUser._id}, {unlikes: unLikes, likes: likes}, (err, result) => {
		res.json(common.getResponses('020', {}));
	});
}

UserController.prototype.getUnLikedUsers = (req, res) => {
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	var unLikes = (req.accessUser.unlikes && req.accessUser.unlikes.length) ? req.accessUser.unlikes : [];
	const passField = ['offset', 'limit'];
	var criteria = common.getPassFields(passField, req.body);
	criteria.condition = [{_id: { $in: unLikes }}];
	req.accessUser.getUsers(criteria, (err, users) => {
		res.json(common.getResponses('020', users));
	});
}

UserController.prototype.getWhoLikes = (req, res) => {
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	const passField = ['offset', 'limit'];
	var criteria = common.getPassFields(passField, req.body);
	criteria.condition = [
		{_id: {$nin: req.accessUser.likes}},
		{likes: {$all: [req.accessUser._id]}}
	];
	req.accessUser.getUsers(criteria, (err, users) => {
		res.json(common.getResponses('020', users));
	});
}

UserController.prototype.getMatchedUsers = (req, res) => {

	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	const passField = ['offset', 'limit'];
	var criteria = common.getPassFields(passField, req.body);
	criteria.condition = [
		{_id: {$ne: req.accessUser._id}},
		{
			$and: [
				{_id: {$in: req.accessUser.likes}},
				{ likes: {$all: [req.accessUser._id]} }
			]
		}
	];
	req.accessUser.getUsers(criteria, (err, users) => {
		res.json(common.getResponses('020', users));
	});
}

module.exports = UserController;