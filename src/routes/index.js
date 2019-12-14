const express = require('express');
const app = express.Router();
var common = require('../js/util.js');
var config = require('../config');

app.get('/', (req, res) => {
	config.db.get('settings', {}, data => {
		res.json(common.getResponses('020', {title: data[0] ? data[0].title : ''}));
	});
});

module.exports = app;