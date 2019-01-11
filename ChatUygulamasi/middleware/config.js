var express = require("express");
var path= require('path');

var method=config.prototype;

function config(app){

	
	app.set('view engine', 'html');


	app.engine('html', require('ejs').renderFile);


	app.set('views', (__dirname + '/../views'));


	app.use(express.static(path.join('views')));

}

method.get_config=function(){
	return this;
}

module.exports = config;
