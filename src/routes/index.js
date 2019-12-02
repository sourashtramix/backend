const express = require('express');
const app = express.Router();
const path = require('path');
const fs = require('fs');


var common = require('../js/util.js');
var config = require('../config');
const User = new (require('../controller/user.js'));
const upload = common.getFileUploadMiddleware();

app.post('/login', User.login);
app.post('/signup', User.signup);
app.get('/logout', User.auth(), User.logOut);
app.get('/validateuser', User.validateToken);
app.post('/forgetpassword', User.forgetPassword);
app.get('/getme', User.auth(), User.Get_Me);
app.post('/profileexist', User.isUserExist);
app.post('/setpassword', User.setPassword);	
app.post('/oauthsignin', upload.single('photoUrl'), User.OAuthSignin);
app.post('/updateuser', upload.single('photoUrl'), User.auth(), User.updateUser);
app.post('/changepassword', User.auth(), User.changePassword);

app.get('/', (req, res) => {
	config.db.get('settings', {}, data => {
		res.json(common.getResponses('020', {title: data[0] ? data[0].title : ''}));
	});
});

module.exports = app;