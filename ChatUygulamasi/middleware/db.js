
var mysql = require("mysql");

var method = db.prototype;

function db() {
	/*
		MySql bağlantısı oluşturuluyor
	*/
	var con = mysql.createPool({
		host : 'localhost',
	  	user : 'root',
	  	password : '',
	  	database : 'chat'
	});
	this.connection=con;
}
method.getcon = function() {
	return this;
};

module.exports = db;
