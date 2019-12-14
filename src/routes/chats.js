const express = require('express');
const app = express.Router();
const userController = new (require('../controllers/user.js'));
const chatController = new (require('../controllers/chats.js'));
app.post('/sendmessage', userController.auth(), chatController.sendMessage);
app.post('/getmessages', userController.auth(), chatController.getMessages);
app.post('/deletemessage', userController.auth(), chatController.deleteMessage);
app.post('/deleteallmessage', userController.auth(), chatController.deleteAllMessage);
module.exports = app;