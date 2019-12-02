var common = require('../js/util.js');
var ObjectId = require('mongodb').ObjectId;
var config = require('../config/index.js');
var path = require('path');
const fs = require('fs');
var http = require('http'),                                                
Stream = require('stream').Transform;

function User() {
	var self = this;
	this.auth = function(){
		return function(req, res, next){

			if(req.headers.hasOwnProperty('token')){

				var token = req.headers.token;
				self.isValidAccessToken(token, (isValid, user) => {
					if(isValid){
						req.accessToken = token;
						req.accessUser = user;
						next();
					}
					else
						res.json(common.getResponses('005', {}));
				});

			}else
				next();
		};
	};
};

User.prototype.Get_Me = (req, res) => {
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
	delete user.password;
	delete user.accessToken;
	delete user.Verification_Mail;
	var syncCount = 0, actualCount = 0;	

	var sendResponse = (user) => {

		if(actualCount != syncCount)
			return;

		res.json(common.getResponses('020', user));
	};

	if(user.User_Type == 'seeker'){
		user.video = {};
		syncCount++;
		const video = new (require('../modal/videos.js'));
		video.getVideos({userId: user._id, callBack: (videos) => {
			if(videos.length > 0){
				user.video = videos[0];
				user.video.path = config.liveUrl + 'storage/videos/' + videos[0].name;
			}
			actualCount++;
			sendResponse(user);
		}});
	}
	
	if(req.accessUser.chatConversations){
		syncCount++;
		var cts = typeof user.chatConversations == 'string'
		 ? [user.chatConversations]
		 : user.chatConversations;

		var lookups = [];
		lookups.push({
			$match: {
				$and: [
					{chatConversations: {$elemMatch: {$in: cts}}},
					{_id: {$ne: user._id}}
				]					
			}
		});
		lookups.push({ $project : { password: 0, Verification_Mail : 0 , accessToken : 0 } });
		config.db.customGetData('user', lookups,  (err, users) => {
			user.chatUsers = users;
			actualCount++;
			sendResponse(user);
		});
	}else
		sendResponse(user);
};

User.prototype.signup = function(req, res){
	var self = new User();
	if(!req.body.First_Name ||
		!req.body.Email_Id ||
		!req.body.password ||
		!req.body.cpassword){
		res.json(common.getResponses('003', {}));
		return;
	}

	if(req.body.password != req.body.cpassword){
		res.json(common.getResponses('025', {}));
		return;
	}

	var verifyToken = common.getCrptoToken(32);
	var Verification_Mail = {
		token: verifyToken,
		gtime: common.current_time()
	};
	const User_Type = req.body.User_Type ? 
	(req.body.User_Type == 'seeker' ? 'seeker' : 'provider') 
	: 'seeker';

	var cond = {Email_Id: req.body.Email_Id};
	config.db.get('user', cond, (data) => {
		if(data.length > 0){
			if(data[0].password){
				if(data[0].isActivated == 0){
					var link = config.frontEndUrl + "validateuser?token="
						+ verifyToken;
					var UPD = {Verification_Mail: Verification_Mail};
					config.db.update('user', {_id: data[0]._id}, UPD, (err, result) => {
						self.verificationMail(link, req.body.Email_Id, "Activation");
						res.json(common.getResponses('009', {type: 1}));
					});
				}else
					res.json(common.getResponses('015', {}));
			}
			else{
				var link = config.frontEndUrl + "setpassword?token="
				+ verifyToken + "&reset=false";
				var UPD = {Verification_Mail: Verification_Mail};
				config.db.update('user', {_id: data[0]._id}, UPD, (err, result) => {
					self.verificationMail(link, data[0].Email_Id, "Generate Password");
					res.json(common.getResponses('008', {type: 2}));
				});
			}
		}else{
			var newUser = {
				_id: common.getMongoObjectId(),
				First_Name: req.body.First_Name,
				Last_Name: req.body.Last_Name ? req.body.Last_Name : '',
				Email_Id: req.body.Email_Id,
				Mobile_Number: req.body.Mobile_Number ? req.body.Mobile_Number : '',
				password: common.getPasswordHash(req.body.password),
				User_Type: User_Type,
				isActivated: 0,
				chatConversations: [],
				avatar: '',
				Verification_Mail: Verification_Mail
			};
			var link = config.frontEndUrl + "validateuser?token="
				+ verifyToken;
			config.db.insert('user', newUser, (err, result) => {
				self.verificationMail(link, req.body.Email_Id, "Activation");
				res.json(common.getResponses('009', {type: 1}));
		    });
		}
	});
};

User.prototype.uploadAvatar = (req, res, _id, cb) => {
	var avatarExt = avatarFileName = avatarTargetPath = '';
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


User.prototype.OAuthSignin = function(req, res){

	var self = new User();
	if((!req.body.emailAddress &&
		!req.body.mobileNumber)){
		res.json(common.getResponses('003', {}));
		return;
	}

	var emailAddress = req.body.emailAddress ? req.body.emailAddress : '';
	var mobileNumber = req.body.mobileNumber ? req.body.mobileNumber : '';
	var token = common.getCrptoToken(32);
	var $or = [];
	if(typeof req.body.emailAddress != 'undefined')
	    $or.push({Email_Id: emailAddress});
	if(typeof req.body.mobileNumber != 'undefined')
	    $or.push({Mobile_Number: mobileNumber});
	var cond = {
		$and: [				
			{$or: $or},
			{isDeleted: {$ne: 1}}
		]
	};
	config.db.get('user', cond, (data) => {
		if(data.length > 0){
			data = data[0];			
			var tokens = !data.hasOwnProperty('accessToken') || typeof data.accessToken.length == 'undefined'
			|| typeof data.accessToken == 'string' ? [] : data.accessToken;
			tokens.push(token);
			config.db.update('user', {_id: data._id}, {accessToken: tokens}, (err, result) => {
				res.json(common.getResponses('020', {accessToken: token}));
			});
		}else{
			
			/*if(req.body.photoUrl){
				newUser.avatar = 'dvs_' + newUser._id;
				self.saveAvatar(req.body.photoUrl, './src/uploads/avatars/' + newUser.avatar);
			}*/

			if(!req.body.firstName){
				res.json(common.getResponses('003', {}));
				return;
			}
			const User_Type = req.body.User_Type ? 
			(req.body.User_Type == 'seeker' ? 'seeker' : 'provider') 
			: 'seeker';
			var newUser = {
					_id: common.getMongoObjectId(),
					First_Name: req.body.firstName,
					Email_Id: emailAddress,
					Mobile_Number: mobileNumber,
					User_Type: User_Type,
					isActivated: 1,
					avatar: '',
					accessToken: [token],
					chatConversations: []
				};

			self.uploadAvatar(req, res, newUser._id, fileName => {
				newUser.avatar = fileName;
				config.db.insert('user', newUser, (err, result) => {
					res.json(common.getResponses('020', {accessToken: token}));
			    });
			});
		}
	});

};

User.prototype.isUserExist = (req, res) => {
	var self = new User();
	if((!req.body.emailAddress &&
		!req.body.mobileNumber)){
		res.json(common.getResponses('003', {}));
		return;
	}

	var emailAddress = req.body.emailAddress ? req.body.emailAddress : '';
	var mobileNumber = req.body.mobileNumber ? req.body.mobileNumber : '';
	var token = common.getCrptoToken(32);
	var $or = [];
	if(typeof req.body.emailAddress != 'undefined')
	    $or.push({Email_Id: emailAddress});
	if(typeof req.body.mobileNumber != 'undefined')
	    $or.push({Mobile_Number: mobileNumber});
	var lookups = [];
    lookups.push({
        $match: {
            $and: [				
				{$or: $or},
				{isDeleted: {$ne: 1}}
			]                 
        }
    });
    lookups.push({ $project : { password: 0, Verification_Mail : 0 , accessToken : 0 } });
	config.db.customGetData('user', lookups,  (err, data) => {
		if(data.length > 0){
			res.json(common.getResponses('020', data[0]));
		}else
			res.json(common.getResponses('043', {}));
	});
};

User.prototype.saveAvatar = function(url, targetPath) {                  

	http.request(url, function(response) {                                        
		var data = new Stream();                                                    

		response.on('data', function(chunk) {                                       
		    data.push(chunk);                                                         
		});                                                                         

		response.on('end', function() {                                             
		    fs.writeFileSync(targetPath, data.read());                               
		});                                                                         
	}).end();
}

User.prototype.login = function(req, res){

	if(!req.body.email ||
		!req.body.password){
		res.json(common.getResponses('003', {}));
		return;
	}

	var cond = {
		$and: [
			{Email_Id: req.body.email},
			{isDeleted: {$ne: 1}}
		]
	};
	config.db.get('user', cond, (data) => {
		if(data.length == 0){
			res.json(common.getResponses('004', {}));
		}else{

			var ind = -1;
			data.forEach((usr, k) => {
				if(usr.password){
					if(common.validatePassword(usr.password, req.body.password))
						ind = k;
				}
			});

			if(ind == -1 || ind >= data.length){
				res.json(common.getResponses('034', {}));
				return;
			}

			var matchUser = data[ind];
			if(matchUser.isActivated == 1){
				var token = common.getCrptoToken(32);
				var tokens = !matchUser.hasOwnProperty('accessToken') || typeof matchUser.accessToken.length == 'undefined'
				|| typeof matchUser.accessToken == 'string' ? [] : matchUser.accessToken;
				tokens.push(token);
				config.db.update('user', {_id: matchUser._id}, {accessToken: tokens}, (err, result) => {
					res.json(common.getResponses('020', {accessToken: token,
					User_Type: matchUser.User_Type}));
				});
			}else
				res.json(common.getResponses('023', {}));
		}
	});
};

User.prototype.logOut = function(req, res){
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	var data = req.accessUser;
	var tokens = !data.hasOwnProperty('accessToken') || typeof data.accessToken.length == 'undefined'
		|| typeof data.accessToken == 'string' ? [] : data.accessToken;
	tokens.splice(tokens.indexOf(req.accessToken), 1);
	config.db.update('user', {_id: data._id}, {accessToken: tokens}, (err, result) => {
		res.json(common.getResponses('024', {}));
	});
};

User.prototype.isValidAccessToken = function(token, cb){
	config.db.get('user', {accessToken: {$all: [token]}, isDeleted: {$ne: 1}}, (data) => {
		if(data.length > 0)
		    cb(true, data[0]);
		else
			cb(false, data);
	});
};

User.prototype.verificationMail = function(link, UEmail, subject){	

	config.db.get('settings', {}, (data) => {
		if(data.length > 0){
			data = data[0];
			var content = '<h3>'+data.title+'</h3>';
			content += '<p><a href="'+link+'">click here to do action</a></p>';
			var cfg = config.smtp_config;
			cfg.auth.user = data.smtp_user;
			cfg.auth.pass = data.smtp_password;
			cfg.content = content;
			cfg.subject = subject;
			cfg.to = UEmail;
			common.sendEMail(cfg);
		}
	});

};

User.prototype.validateToken = function(req, res){
	var self = new User();
	if(!req.query.token){
		res.json(common.getResponses('006', {}));
		return;
	}
	var token = req.query.token;
	self.isValidToken(token, (data, isValid, isExpired) => {
		if(isValid && isExpired){
			res.json(common.getResponses('007', {}));
		}
		else if(isValid && !isExpired){
			var UPD = {isActivated: 1, Verification_Mail: {}};
			if(req.query.reset){
				if(req.query.reset == 'false')
					delete UPD.Verification_Mail;
			}
			config.db.update('user', {_id: data[0]._id}, UPD, (err, result) => {
				res.json(common.getResponses('027', {}));
			});
		}else{
			res.json(common.getResponses('006', {}));
		}
	});
};

User.prototype.isValidToken = function(token, cb){
	config.db.get('user', {"Verification_Mail.token": token}, (data) => {
		if(data.length > 0){
			var ct = common.current_time();
			var gt = new Date(data[0].Verification_Mail.gtime);
			gt = common.current_time(
				common.addHours(gt, 0.5));
			if(ct <= gt )
				cb(data, true, false);
			else
				cb(data, true, true);
		}
		else
			cb(data, false, false);
	});
};


User.prototype.forgetPassword = function(req, res){
	var self = new User();
	if(!req.body.Email_Id){
		res.json(common.getResponses('003', {}));
		return;
	}

	config.db.get('user', {Email_Id: req.body.Email_Id}, (data) => {
		if(data.length == 0)
			res.json(common.getResponses('017', {}));
		else{
			var verifyToken = common.getCrptoToken(32);
			var Verification_Mail = {
				token: verifyToken,
				gtime: common.current_time()
			};
			var link = config.frontEndUrl + "setpassword?token="
			+ verifyToken + "&reset=false";
			var UPD = {Verification_Mail: Verification_Mail};
			config.db.update('user', {_id: data[0]._id}, UPD, (err, result) => {
				self.verificationMail(link, data[0].Email_Id, "Reset Password");
				res.json(common.getResponses('029', {}));
			});
		}
	});
};

User.prototype.setPassword = function(req, res){
	var self = new User();
	if(!req.body.verifyToken){
		res.json(common.getResponses('006', {}));
		return;
	}

	if(!req.body.New_Password ||
		!req.body.Confirm_Password){
		res.json(common.getResponses('003', {}));
		return;
	}

	if(req.body.New_Password != req.body.Confirm_Password){
		res.json(common.getResponses('025', {}));
		return;
	}

	var token = req.body.verifyToken;
	self.isValidToken(token, (data, isValid, isExpired) => {
		if(isValid && isExpired){
			res.json(common.getResponses('007', {}));
		}
		else if(isValid && !isExpired){
			var UPD = {
				password: common.getPasswordHash(req.body.New_Password),
				isActivated: 1,
				Verification_Mail: {}
			};
			/*self.mailForPasswordChange(data[0].Email_Id);*/
			config.db.update('user', {_id: data[0]._id}, UPD, (err, result) => {
				res.json(common.getResponses('028', {}));
			});
		}else{
			res.json(common.getResponses('006', {}));
		}
	});

};

User.prototype.updateUser = function(req, res) {
	var self = new User();
	if(!req.hasOwnProperty('accessToken') ||
		!req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	var UPD = {};
	if(req.body.firstName)
		UPD.First_Name = req.body.firstName;

	if(req.body.emailAddress)
		UPD.Email_Id = req.body.emailAddress;

	if(req.body.lastName)
		UPD.Last_Name = req.body.lastName;

	if(req.body.mobileNumber)
		UPD.Mobile_Number = req.body.mobileNumber;

	var resp = {avatarDir: config.liveUrl + 'image/avatars/'};
	var avatarExt = avatarFileName = avatarTargetPath = '';
	var avatarDir = './src/uploads/avatars/';
	var afterTrigger = function(resp, UPD){
		config.db.update('user', {_id: req.accessUser._id}, UPD, (err, result) => {
			res.json(common.getResponses('002', resp));
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

User.prototype.changePassword = (req, res) => {
	if(!req.hasOwnProperty('accessToken') || !req.hasOwnProperty('accessUser')){
		res.json(common.getResponses('005', {}));
		return;
	}

	if(!req.body.New_Password ||
		!req.body.Confirm_Password ||
		!req.body.Old_Password){
		res.json(common.getResponses('003', {}));
		return;
	}

	if(req.body.New_Password != req.body.Confirm_Password){
		res.json(common.getResponses('025', {}));
		return;
	}

	if(!common.validatePassword(req.accessUser.password, req.body.Old_Password) ){
		res.json(common.getResponses('034', {}));
		return;
	}

	var UPD = {
		password: common.getPasswordHash(req.body.New_Password)
	};
	config.db.update('user', {_id: req.accessUser._id}, UPD , (err, result) => {
		/*self.mailForPasswordChange(req.accessUser.Email_Id);*/
		res.json(common.getResponses('028', {}));
	});

};

User.prototype.uploadFileByBase64 = function(enCodeData, dirPath, fileName, cb){
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
};

module.exports = User;