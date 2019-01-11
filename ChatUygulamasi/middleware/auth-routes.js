

var bodyParser = require('body-parser');
var multer  = require('multer');
var fs = require('fs');


/*Eklenecek dosyaların nereye yükleneceği seçilir*/

var upload = multer({ dest: './views/uploads' });


var method=routes.prototype;

function routes(app,connection,sessionInfo){

	var file_path="";
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());


	app.get('/', function(req, res){

		sessionInfo=req.session;
		/*Oturum açılmamışsa Login sayfasını getir*/

		if(sessionInfo.uid){
			res.redirect('/home#?id='+sessionInfo.uid);
		}else{
			res.render("login");
		}
	});

	/*
		Login isteğini gerçekleştirecek istek
	*/
	app.post('/login', function(req, res){


		sessionInfo=req.session;

		username=req.body.username;
		password=req.body.password;

		var data={
			query:"select * from user where password='"+password+"' and name='"+username+"' ",
			connection:connection
		}
		/*
			SQL sorgularını yürütmesi için -> query_runner
		*/
		query_runner(data,function(result){
			var uid="";
			result.forEach(function(element, index, array){
				uid=element.id;
			});

			if(result.length>0) {

				// Oturumun açılması

				sessionInfo.uid = uid;

				var set_online={
					query:"update user set online='Y' where id='"+uid+"'",
					connection:connection
				}
				query_runner(set_online,function(result_online){});
				result_send={
			    		is_logged:true,
			    		id:uid,
			    		msg:"OK"
			    };
		    } else {
		    	result_send={
		    		is_logged:false,
		    		id:null,
		    		msg:"BAD"
		    	};
		    }
		    /*
				Client'a cevabın gönderilmesi
			*/
		    res.write(JSON.stringify(result_send));
			res.end();
		});
	});

	/*
		Kullanıcı adının uygun olup olmadığının denetlenmesi
	*/
	app.post('/check_name', function(req, res){
		username=req.body.username;
		var data={
			query:"select * from user where name='"+username+"'",
			connection:connection
		}
		query_runner(data,function(result){

			if(result.length>0) {
		    	result_send={
		    		msg:true
		    	};
		    } else {
		    	result_send={
		    		msg:false
		    	};
		    }
		    res.write(JSON.stringify(result_send));
			res.end();
		});
	});

	/*
		Kullanıcı adının kaydedilmesi
	*/
	app.post('/register', upload.single('file'), function(req, res, next){

		sessionInfo=req.session;
		/*
			Upload Başlangıcı
		*/
		var file_path = './views/uploads/' + Date.now()+req.file.originalname;
		var file_name = '/uploads/' + Date.now()+req.file.originalname;
		var temp_path = req.file.path;

		var src = fs.createReadStream(temp_path);
		var dest = fs.createWriteStream(file_path);
		src.pipe(dest);
		/*
			Upload Bitişi
		*/
		src.on('end', function() {
			/*
				Dosya yüklemesi bittikten sonra kullanıcının veri tabanına eklenmesi
			*/
			var insert_data = {
				id:'',
				name:req.body.username,
				password:req.body.password,
				p_photo:file_name,
				timestamp:Math.floor(new Date() / 1000),
				online:'Y'
			};
			var data={
				query:"INSERT INTO user SET ?",
				connection:connection,
				insert_data:insert_data
			};
			query_runner(data,function(result){

				// Oturum ID sinin tutulması

				sessionInfo.uid = result.insertId;

				if(result) {
					result_send={
			    		is_logged:true,
			    		id:result.insertId,
			    		msg:"OK"
			    	};
				}else{
					result_send={
			    		is_logged:false,
			    		id:null,
			    		msg:"BAD"
			    	};
				}
				res.write(JSON.stringify(result_send));
				res.end();
			});
		});
		src.on('error', function(err) {
			/*
				Hata Gönderilmesi
			*/
			res.write(JSON.stringify("Error"));
			res.end();
		});
	});

	/*
		Çıkış isteğinin handle edilmesi
	*/


}

method.getroutes=function(){
	return this;
}

module.exports = routes;

/*
	SQL sorgularını yürütmesi için -> query_runner 
*/
var query_runner=function(data,callback){
	var db_conncetion=data.connection;
	var query=data.query;
	var insert_data=data.insert_data;
	db_conncetion.getConnection(function(err,con){
		if(err){
		  con.release();
		}else{
			db_conncetion.query(String(query),insert_data,function(err,rows){
		    con.release();
		    if(!err) {
		    	callback(rows);
		    } else {
		      console.log(err);
		      console.log("Query failed");
		    }
		  });
		}
	});
}
