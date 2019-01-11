var bodyParser = require('body-parser');


// helper sınıfındaki metodların kullanılması için projeye dahil ediliyor

var helper = require('./helper');
exports.helper = helper;

var method=routes.prototype;

function routes(app,connection,io,sessionInfo){
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());

	// Kullanıcılar dizisi oluşturuluyor

	var users=[];
	var uid="";


	/*
		Socket Event başlangıcı
	*/

	io.on('connection',function(socket){



		var uIdSocket=socket.request.session.uid;


		// Kullanıcıların dizide nesne olarak tutulması

	    socket.on('userInfo',function(userinfo){
	    	/*
	    		Kullanıcılar dizisine bir socketin eklenmesi
	    	*/

			var should_add=true;
	    	if(users.length == 0){
	    		userinfo.socketId=socket.id;
	    		users.push(userinfo);
	    	}else{
	    		users.forEach(function(element, index, array){
	    			if(element.id == userinfo.id){
			    		should_add=	false;
			    	}
				});
				if (should_add) {
					userinfo.socketId=socket.id;
	    			users.push(userinfo);
			    };
	    	}

	    	var data={
				query:"update user set online='Y' where id='"+userinfo.id+"'",
				connection:connection
			}
			helper.queryRunner(data,function(result){
				/*
		    		Kullanıcı listesinin tüm kullanıcılara gönderilmesi
		    	*/
				users.forEach(function(element, index, array){
		    		helper.getUserChatList(element.id,connection,function(dbUsers){
		    			if(dbUsers === null){
		    				io.to(element.socketId).emit('userEntrance',users);
		    			}else{
		    				helper.mergeUsers(users,dbUsers,'no',function(mergedUsers){
		    					io.to(element.socketId).emit('userEntrance',mergedUsers);
		    				});
		    			}
		    		});
				});
			});



	    	should_add=true;
	    });

	   	/*
			'sendMsg' : VT ye mesajı kaydeder.
	   	*/
	   	socket.on('sendMsg',function(data_server){

	    	/*
	    		Mesajların VT ye kaydı için 'saveMsgs'  fonksiyonun çağrılması
	    	*/
	    	helper.saveMsgs(data_server,connection,function(result){

	    		/*
	    			Kullanıcıların çevrimdışı olup olmadığı kontrol ediliyor
	    		*/
	    		if(data_server.socket_id==null){

	    			/*
	    				Çevrimdışı olma durumunda göndericinin kullanıcı listesinin güncellenmesi
	    			*/
	    			var singleUser=users.find(function(element){
	    				return element.id == data_server.from_id;
	    			});
	    			/*
	    				'getUserChatList' : Kullanıcı konuşma listesinin çağrılması
	    			*/
					helper.getUserChatList(singleUser.id,connection,function(dbUsers){
			    		if(dbUsers === null){
			    			io.to(singleUser.socketId).emit('userEntrance',users);
			    		}else{
			    			/*
	    						'mergeUsers' : Çevrimiçi ve Çevrimdışı kullanıcıların ayrılması için çağrılır
	    					*/
			    			helper.mergeUsers(users,dbUsers,'no',function(mergedUsers){
			    				io.to(singleUser.socketId).emit('userEntrance',mergedUsers);
			    			});
			    		}
			    	});
				}else{
					/*
	    				Online ise alıcıya mesajı gönder
	    			*/
	    			io.to(data_server.socket_id).emit('getMsg',result);
	    		}
	    	});
	    });


	    /*
	    	Kullanıcıya 'yazıyor' biildiriminin gönderilmesi
	    */
	    socket.on('setTypingNotification',function(data_server){
	    	io.to(data_server.data_socket_fromid).emit('getTypingNotification',data_server);
	    });

	    /*
	    	Kullanıcı çıkış yaptığında listeden çıkarılması
	    */
	    socket.on('disconnect',function(){
	    	var spliceId="";
	    	for(var i=0;i<users.length;i++){
				if(users[i].id==uIdSocket){
					if(users[i].socketId==socket.id){
					  	var data={
							query:"update user set online='N' where id='"+users[i].id+"'",
							connection:connection
						}
						spliceId=i;
						helper.queryRunner(data,function(result){
							users.splice(spliceId,1); // Tek kullanıcının çıkarılması
							io.emit('exit',users[spliceId]);
						});
					}
				}
			}

		});
	});
	/*
		Socket event bitişi
	*/


	/*
		Ana sayfanın render edilmesi
	*/

	app.get('/home',function(req, res){
		sessionInfo=req.session;
		if(!sessionInfo.uid){
			res.redirect("/");
			res.end();
		}else{
			/*res.redirect('/home#?id='+sessionInfo.uid);*/
			res.render('home');
			res.end();
		}
	});

	/*
		get_userinfo isteğinin handle edilmesi için post metodu
	*/
	app.post('/get_userinfo', function(req, res){
		var data={
			query:"select id,name,p_photo,online from user where id='"+req.body.uid+"'",
			connection:connection
		}
		helper.queryRunner(data,function(result){
			if(result.length>0) {
				var user_info="";
				result.forEach(function(element, index, array){
					user_info=element;
				});
		    	result_send={
		    		is_logged:true,
		    		data:user_info,
		    		msg:"OK"
		    	};
		    } else {
		    	result_send={
		    		is_logged:false,
		    		data:null,
		    		msg:"BAD"
		    	};
		    }
		    res.write(JSON.stringify(result_send));
			res.end();
		});
	});

	/*
		et_msgs isteğinin handle edilebilmesi için post
	*/
	app.post('/get_msgs', function(req, res){
		/*
	    	Calling 'getMsgs' to get messages
	    */
		helper.getMsgs(req.body,connection,function(result){
			res.write(JSON.stringify(result));
			res.end();
		});
	});

	/*
		handle get_recent_chats isteğinin handle edilebilmesi için post
	*/
	app.post('/get_recent_chats', function(req, res){
		/*
	    	'getUserChatList' : Kullanıcı konuşma listesi
	    */
		helper.getUserChatList(req.body.uid,connection,function(dbUsers){
			res.write(JSON.stringify(dbUsers));
			res.end();
		});
	});

	/*
		get_users_to_chats isteğinin handle edilebilmesi için post
	*/
	app.post('/get_users_to_chats', function(req, res){
		/*
	    	'getUsersToChat' : Kullanıcı konuşma listesi
	    */
		helper.getUsersToChat(req.body.uid,connection,function(dbUsers){
			/*
				'mergeUsers' : Çevrimiçi ve Çevrimdışı kullanıcıları ayırır
			*/
			helper.mergeUsers(users,dbUsers,'yes',function(mergedUsers){
	    		res.write(JSON.stringify(mergedUsers));
	    		res.end();
	    	});
		});
	});

	app.get('/logout', function(req, res){
		sessionInfo=req.session;
		var uid=sessionInfo.uid;

		var data={
			query:"update user set online='N' where id='"+uid+"'",
			connection:connection
		}
		helper.queryRunner(data,function(result){

			req.session.destroy(function(err) {
				if(err) {
			    	console.log(err);
			  	} else {
			  		io.emit('exit',1);
					res.redirect('/');
			  	}

			});
		});
	});

}

method.getroutes=function(){
	return this;
}

module.exports = routes;
