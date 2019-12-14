const express = require('express');
const app = express.Router();
const path = require('path');
const fs = require('fs');


var common = require('../js/util.js');
var config = require('../config');
const userController = new (require('../controllers/user.js'));
const upload = common.getFileUploadMiddleware();

app.get('/getme', userController.auth(), userController.Get_Me);
app.post('/checkuserexist', userController.checkExistUser);
app.post('/oauthsignin', upload.single('photoUrl'), userController.OAuthSignin);
app.post('/updateuser', upload.single('photoUrl'), userController.auth(), userController.updateUser);
app.get('/logout', userController.auth(), userController.logOut);
app.post('/getnearbyusers', userController.auth(), userController.getNearByUsers);

app.post('/hitlike', userController.auth(), userController.hitLike);
app.post('/hitunlike', userController.auth(), userController.hitUnLike);
app.post('/getunlikedusers', userController.auth(), userController.getUnLikedUsers);
app.post('/getwholikes', userController.auth(), userController.getWhoLikes);
app.post('/getmatchedusers', userController.auth(), userController.getMatchedUsers);
module.exports = app;