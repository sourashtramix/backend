
var DB = require('./db');
var SMTP = require('./SMTPmailConfig.js');

var main = {
	development: {
		name: 'SMIX',
		port: process.env.PORT || 5000
	},
	production: {
		name: 'SMIX',
		port: process.env.PORT || 5000
	},
	db: new DB(),
	smtp_config: {
	    host: "smtp.gmail.com",
	    port: 465,
	    secure: true, 
	    auth: {
	        user: "",
	        pass: ""
	    }
	},
	session_time: 999999999999,
	liveUrl: 'http://localhost:5000/',
	frontEndUrl: 'http://localhost:8080/',
	setSMTPConfig: function(cb){
		main.db.get('settings', {}, (settings) => {
			var smtp;
			if(settings.length > 0)
				smtp = new SMTP(settings[0].smtp_config);
			else
				smtp = new SMTP(main.smtp_config);
			cb(smtp);
		});
	}
};

module.exports = main;
