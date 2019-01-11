

var app = require("express")();
var http = require('http').Server(app);
var io = require("socket.io")(http);
var Session = require('express-session');
var cookieParser = require('cookie-parser');



// Oturum cookike de saklandı ve parse için bu kullanıldı
app.use(cookieParser());

// Oturum
var Session= Session({
	secret:'secrettokenhere',
	saveUninitialized: true,
	resave: true
});


io.use(function(socket, next) {
	    Session(socket.request, socket.request.res, next);
});


app.use(Session);

var sessionInfo;

/* config.js in projeye dahil edilmesi */
var config =require('./middleware/config.js')(app);


/* db.js in projeye dahil edilmesi */
// Database
var db = require("./middleware/db.js");
var connection_object= new db();
var connection=connection_object.connection; // baglantı nesnesi



/*
	auth-routes.js : Giriş ve Kayıt işleri ile ilgilenir.

	auth-routes.js : Giriş ve Kayıt işleri için metodlar ve yönlendirmeleri içerir.
*/
require('./middleware/auth-routes.js')(app,connection,Session,cookieParser,sessionInfo);
/*
	1. routes.js : Ana sayfa işleri ile ilgilenir
	3. routes.js : Ana sayfa için metodlar ve yönlendirmeleri içerir.
*/
require('./middleware/routes.js')(app,connection,io,Session,cookieParser,sessionInfo);

/*
	Uygulamanın çalıştırılması
*/
http.listen(3000,function(){
    console.log("Listening on http://127.0.0.1:3000");
});
