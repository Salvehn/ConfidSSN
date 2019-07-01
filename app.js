let createError = require('http-errors');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let mv = require('mv')
let fs = require('fs');
let Em = require('./evem.js');
let ev = Em;
let scopes=require('./RestAPI').scopes
let con = require('./db.js')

const express = require('express')
let app = express()

// // view engine setup
let ID = function (length) {
    return Math.random().toString(36).substr(2, length);
};
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let APIRouter = require('./RestAPI');
let indexRouter = require('./routes/index');
app.use('/', indexRouter);
app.use('/api', APIRouter);
let pretty = require('express-prettify');

app.use(pretty({ query: 'pretty' }));
// let loginRouter = require('./routes/login');
// app.use('/login', loginRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


let server =app.listen(3001);

let sio = require("socket.io").listen(server)

let socketSession = require("socket.io-mysql-session")


//add the middleware
process.setMaxListeners(20)
sio.use(new socketSession({
    db: con,           //MySQL conneciton - required//filelogger - optional
    expiration: 360000000  //expiration time in seconds - optional - defaults to 86400000
}));

let routes={
    "login":{"url":"./views/ws/login.html"},
    "search":{"url":"./views/ws/search.html"},
    "contacts":{"url":"./views/ws/friends.html"},
    "profile":{"url":"./views/ws/profile.html"},
    "watch_profile":{"url":"./views/ws/view_profile.html"},
    "chats":{"url":"./views/ws/chats.html"},
    "settings":{"url":"./views/ws/settings.html"},
    "messages":{"url":"./views/ws/chats.html"}
}






function socket(ws,msg) {
    let json = msg
    let url = json.url;
    let profile_id=json.id
    let page='';
    console.log('profile id '+profile_id)
    if(Object.keys(routes).find(r=>r==url)){
        page = (fs.readFileSync(routes[url].url)).toString()
    }
    switch (url){
        case 'messages':
            con.getUser(profile_id,function (u) {
                ws.emit('loadpage',{'page':page,'info':u,'author':ws.session.get("idv"), 'url':url})
            })
            break;
        case 'profile':
            con.getUser(ws.session.get("idv"),function (u) {
                ws.emit('loadpage',{'page':page,'info':u,'url':url})
            })
            break;
        case 'settings':

            ws.emit('loadpage',{'page':page,'info':'','url':url})
            break;
        case 'search':
            ws.emit('loadpage',{'page':page,'info':'','url':url})
            break;
        default:
            ws.emit('loadpage',{'page':page,'info':'','url':url})
            break;
        case 'watch_profile':
            con.getUser(profile_id,function (u) {
                ws.emit('loadpage',{'page':page,'info':u,'url':url})
            })
            break;
    }
}
let connections=0


let dl  = require('delivery')
sio.on('connection', (ws)=> {
    connections++

    console.log(connections);
    
    let delivery = dl.listen(ws);
    delivery.on('receive.success',function(file){
        let params = file.params;
        let user_id=ws.session.get("idv");
       
        let  uploadDir= {
            posts:  'temp',
            avatar: 'logo'
        }
        let dir = path.join(__dirname, `public/uploads/${user_id}/${uploadDir[params.dir]}/`);
        let fx = require('mkdir-recursive')
        fx.mkdir(dir, function(err) {
        
            console.log('done');
            fs.writeFile(dir+file.name,file.buffer, function(err){
                if(err){
                    console.log('File could not be saved.');
                    console.log(err)
                }else{
                    console.log('File saved to '+(dir+file.name)+'\n'+'Requested path: '+dir);
                    con.setLogo(user_id,(`uploads/${user_id}/logo/${file.name}`))
                };
            });
        });
       
    });
    
   
    ws.on('request',function (msg,aid) {
        let idv=ws.session.get("idv")
      
        let uid = idv
        console.log('uid '+uid)
        if(uid!==''){
            socket(ws,msg)
            con.getFriends(uid,function (fr) {
                fr.forEach(function (v,i) {
                    con.getUser(v.fid,function (u) {
                        if(u.status=='online'){
                        
                            con.updateStatus('online', uid)
                            ws.to(u.id.toString()).emit('statusUpdate', {status: 'online', id: uid})
                        }
                    })
                })
            })
            // })
        }else{
            msg.url='login'
            socket(ws,msg)
        }
    
    })
    ws.on('logout',function (msg) {
        let uid = ws.session.get("idv")
        console.log('logout')
        ws.session.set("idv", '');
        con.getFriends(uid,function (fr) {
            fr.forEach(function (v,i) {
                con.getUser(v.fid,function (u) {
                    if(u.status=='online'){
                        console.log(u.id+' status '+u.status)
                        con.updateStatus('offline', ws.session.get("idv"))
                        ws.to(u.id.toString()).emit('statusUpdate', {status: 'offline', id: uid})


                    }
                })
            })
        })
    })
    ws.on('auth',function (msg,aid) {
        
        con.verifyLoginUser(msg.username, msg.password, function (f) {
            if (f !== '') {
                console.log('success')
                ws.session.set("idv", f);
                ws.emit('success', {'res': 'success','url':'profile',profile: f})
              
             
            } else if (f == '') {
                console.log('no such user')
                // req.session.idv = '';
                ws.session.set("idv", '');
                ws.emit('unsuccess',{'res': 'unsuccess'})
            }
        })
    })
    ws.on('find',function (msg,aid) {
        con.searchUser(msg.textinput,function (u) {
        
            ws.emit('found',{'data':u})
        })
    })
    ws.on('add_friend',function (msg,aid) {
        con.addFriend(ws.session.get("idv"),msg.id,function () {
            ws.emit('added',{'data':'friend added'})
        })
       // ev.emit("add_friend",{socket:ws,msg:msg})
    })
    ws.on('load_friends',function (msg,aid) {
        //ev.emit('load_friends',{socket:ws,msg:msg})
        let list=[]
    
        con.getFriends(ws.session.get("idv"),function (f) {

            f.forEach(function (v,i) {
            
                con.getUser(v.fid,function (u) {
                    list.push(u)
                    if(i==list.length-1){
                        console.log('flist '+list)
                        ws.emit('friend_list',{data:list})
                    }
                })
            })
        })
    })
    ws.on('load_api',function (msg) {
            ws.emit('APIData',{data:scopes})
    })
    ws.on('load_chat_friends',function (msg,aid) {
        //ev.emit('load_friends',{socket:ws,msg:msg})
        let list=[]
        
        con.getFriends(ws.session.get("idv"),function (f) {
            
            f.forEach(function (v,i) {
                
                con.getUser(v.fid,function (u) {
                    list.push(u)
                    if(i==list.length-1){
                        console.log('flist '+list)
                        ws.emit('loaded_chat_friends',{data:list})
                    }
                })
            })
        })
    })
    ws.on('beginChat',function (msg,aid) {
        let user=ws.session.get("idv")
        let userlist=[]
        console.log('chat user '+msg.id)
        msg.id.forEach(function (u,i) {
            userlist.push(u)
            if(i==msg.id.length-1){
                userlist.push(user)
                ws.join(user);
                con.createChatRoom(userlist)
            }
        })
      
    })
    ws.on('generateToken',function (msg,aid) {
        let user=ws.session.get("idv")
        con.createToken(user,msg)
    })
    ws.on('join',function (msg) {
        let user=ws.session.get("idv")
        console.log('room '+msg.room_id)
        ws.join(msg.room_id)
        con.getMessages(msg.room_id,function (list) {
          ws.emit('messages',{data:list,owner:user,room_id: msg.room_id})
        })
    })
    ws.on('part',function (msg) {
        ws.leave(msg.room_id)
    })
    ws.on('sendMsg',function (msg,aid) {
        let user=ws.session.get("idv")
        console.log(msg)
        console.log('msg sent to ' + msg.room_id + ' from '+user)
        ws.to(msg.room_id).emit('msg',{msg:msg.text,owner:user,room_id:msg.room_id});
        con.storeMessage(msg.text,msg.room_id,user)
    })
    ws.on('loadchatrooms',function (msg) {
        let user=ws.session.get("idv")
        console.log('request chats')
        con.getChatrooms(user,function (list) {
            console.log('geting')
            console.log(list)
            ws.emit('chatrooms',{data:list})
        })
    })
    ws.on('loadfeed',function (msg,aid) {
        let user=ws.session.get("idv")
       if(msg.id){
           user=msg.id
       }
        con.getPosts(user,msg.begin,msg.end,function (p) {
       
            con.getLikes(p,function (l) {
              
                ws.emit('post_list',{data:l})
                
            })
           
        },msg)
    })
    
    
    ws.on('publish',function (msg,aid) {
            let user_id=ws.session.get("idv")
            con.addPost(user_id,msg.data.text,msg.data.files,function (post_id) {
                let dir = path.join(__dirname, `public/uploads/${user_id}/${post_id}`);
                let mkdirp = require('mkdirp');
                return new Promise(function(resolve, reject) {
                    mkdirp(dir, async function(err) {
                        msg.data.files.forEach(function (msg_f) {
                            let f_obj={
                                id:ID(20),
                                owner_id:user_id,
                                post_id:post_id,
                                file_uri:`uploads/${user_id}/${post_id}/${msg_f}`
                            }
                            con.addPostFile(f_obj)
                        })
                     
                        let ncp = require('ncp').ncp;
                        ncp.limit = 16;
                        ncp(`public/uploads/${user_id}/temp`, `public/uploads/${user_id}/${post_id}`, function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            console.log('done!');
                            fs.readdir(`public/uploads/${user_id}/temp`, (err, files) => {
                                if (err) throw err;
        
                                for (const file of files) {
                                    fs.unlink(path.join(`public/uploads/${user_id}/temp`, file), err => {
                                        if (err) throw err;
                                    });
                                }
                            });
                        });
                        if(err){
                            reject()
                        }
                    });
                    ws.emit('published')
                });
            })
        //}
        
    })
 
    ws.on('liked',function (msg,aid) {
        con.clickLike(ws.session.get("idv"),msg.post_id,function (l) {
            console.log('UPD')
            ws.emit('like_upd',{post_id:msg.post_id,count:l})
        })
    })
   
})

module.exports = app

