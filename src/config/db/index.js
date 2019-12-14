
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const assert = require('assert');
var collection = require('./collections.js');

const url = true ? 'mongodb://localhost:27017'
: 'mongodb://root:toor@localhost:27017';
const dbName = 'smix';
const settings = {
	"title" : "SMIX", "smtp_user" : "smix.1234890@gmail.com", "smtp_password" : "***"
};

// db.createUser({ 
// 	user: "***" , 
// 	pwd: "***", 
// 	roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
// })

function DB(){
	this.connect = function(cb){
		MongoClient.connect(url, function(err, client) {
		  	assert.equal(null, err);
		  	const db = client.db(dbName);		  	
		  	cb(db);
		  	client.close();
		});
	};
}

DB.prototype.insert = function(tbName, data, cb) {
	this.connect(function(db){
		if(typeof data.length === "undefined"){
			db.collection(tbName).insertOne(data, function(err, r){
				if(err){
					assert.equal(null, err);
	      			assert.equal(2, r.insertedCount);
	      		}
      			cb(err, r);
			});
		}else{
			if(data.length <= 0){
				cb('Empty data', {});
				return;
			}
			db.collection(tbName).insertMany(data, function(err, r){
				if(err){
					assert.equal(null, err);
	      			assert.equal(2, r.insertedCount);
	      		}
      			cb(err, r);
			});
		}
	});
	/*var schemaObject = {};
	Object.keys(data).forEach(key => {
		schemaObject[key] = data[key].constructor;
	});
	const Model = mongoose.model(tbName, new mongoose.Schema(schemaObject));
	var doc = new Model(data);
	doc.save().then(result => cb(false, result)).catch(err => {
      	if(err)
      		console.log(err);
    });*/
};

DB.prototype.update = function(tbName, wh, data, cb){
	this.connect(function(db){
		if(typeof data.length === "undefined"){
			db.collection(tbName).updateMany(wh, {$set: data}, function(err, r){
				if(err){
					assert.equal(null, err);
	      			assert.equal(1, r.matchedCount);
	      			assert.equal(1, r.modifiedCount);
	      		}
      			cb(err, r);
			});
		}
	});
};

DB.prototype.customUpdate = function(tbName, wh, data, cb){
	this.connect(function(db){
		if(typeof data.length === "undefined"){
			db.collection(tbName).updateMany(wh, data, function(err, r){
				if(err){
					assert.equal(null, err);
	      			assert.equal(1, r.matchedCount);
	      			assert.equal(1, r.modifiedCount);
	      		}
      			cb(err, r);
			});
		}
	});
};

DB.prototype.get =  function(tbName, wh, cb){
	this.connect(function(db){
		if(typeof wh.length === "undefined"){
			db.collection(tbName).find(wh).toArray((err, data) => {
				cb(data);
		  	});
		}
	});
};

DB.prototype.customGetData = function(tbName, lookups, cb){
	this.connect(function(db){
		db.collection(tbName).aggregate(lookups, cb);
	});
};


module.exports = DB;
