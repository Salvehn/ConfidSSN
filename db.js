let mysql = require('mysql');
let db_settings = require('./hosts/db_settings.json');
let active = require('./hosts/active.json')
let settings= db_settings[active.active];
let db;
let mkdirp=require('mkdirp')
let moment=require('moment')
const fs = require('fs');
let path= require('path')
let ses='CREATE TABLE IF NOT EXISTS `session` (`sessionId` VARCHAR(32) COLLATE utf8_bin NOT NULL,`expires` int(11) unsigned NOT NULL,`data` text COLLATE utf8_bin,PRIMARY KEY (`sessionId`)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;'


function connectDatabase() {
    if (!db) {
        db = mysql.createConnection(settings);
        db.connect(function(err){
            if(!err) {
                console.log('Database is connected!');
            } else {
                console.log('Error connecting database!');
            }
        });
    }
    db.query(ses, function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Users(id VARCHAR(10) NOT NULL primary key, name VARCHAR(50),surname VARCHAR(50),patronymic VARCHAR(50),birthdate VARCHAR(50), login VARCHAR(50),email VARCHAR(50),logo_url VARCHAR(255),background_url VARCHAR(255),bio VARCHAR(255),org VARCHAR(50), password VARCHAR(50),projectID VARCHAR(255), status VARCHAR(10),publickey VARCHAR(50))", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Projects(id VARCHAR(10) NOT NULL primary key, projectName VARCHAR(100),licence INT)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Tokens(id VARCHAR(20) NOT NULL,user_id VARCHAR(10), expire VARCHAR(10) NOT NULL,permissions VARCHAR(200) NOT NULL)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Friends(user_id VARCHAR(10) NOT NULL primary key, fid VARCHAR(10) NOT NULL)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Followers(user_id VARCHAR(10) NOT NULL, fid VARCHAR(10) NOT NULL)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Posts(id VARCHAR(30) NOT NULL, owner_id VARCHAR(10) NOT NULL, text VARCHAR(255) NOT NULL, storage_id VARCHAR(30) NOT NULL, date DATETIME, repost_id VARCHAR(10))", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Comments(id VARCHAR(30) NOT NULL, owner_id VARCHAR(10) NOT NULL, text VARCHAR(255) NOT NULL, post_id VARCHAR(30) NOT NULL)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Likes(id VARCHAR(30) NOT NULL,post_id VARCHAR(100) NOT NULL, owner_id VARCHAR(10) NOT NULL)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Pfiles(id VARCHAR(30) NOT NULL,post_id VARCHAR(100) NOT NULL, owner_id VARCHAR(10) NOT NULL,file_uri VARCHAR(50))", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Chatrooms(id VARCHAR(40) NOT NULL,user_id VARCHAR(10) NOT NULL, name VARCHAR(100) NOT NULL,owner_id VARCHAR(10) DEFAULT NULL,lastSaid VARCHAR(255),sendDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
    db.query( "CREATE TABLE IF NOT EXISTS Messages(id VARCHAR(40) NOT NULL,owner_id VARCHAR(10) NOT NULL, room_id VARCHAR(40) NOT NULL,text VARCHAR(255),sendDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
   return db;
}

let ID = function (length) {
    return Math.random().toString(36).substr(2, length);
};
let ID2=function (length) {
    let number = Math.random() // 0.9394456857981651
    number.toString(36); // '0.xtis06h6'
    let id = number.toString(36).substr(2, length);
    return id;
}
function createUserS(username,name,surname,birthdate,email,password,project) {
    let generateUser={
        id: ID(9),
        login:username,
        name:name?(name):('John'),
        surname:surname?(surname):('Doe'),
        birthdate:birthdate?(birthdate):('01.01.1970'),
        email:email,
        password:password,
        projectID:project
    }
    
    db.query(`SELECT * FROM Users`,function (err,rs) {
        if (err) throw err;
     
        if (rs.length > 0) {
            if(!rs.find(u=>u.login===username)){
                db.query('INSERT INTO Users SET ?', generateUser, function (err, resp) {
                    console.log(err)
                    console.log('new user');
                });
            }else {
                console.log('user already exists')
            }
        }else {
            db.query('INSERT INTO Users SET ?', generateUser, function (err, resp) {
                console.log(err)
                console.log('new user');
            });
        }
    })
   
}
function arr_diff(a,b) {
    
    let onlyInB = []
    let Aid=[]
    let Bid=[]
    b.forEach(f=>Bid.push(f))
    a.forEach(f=>Aid.push(f))
    let add = Bid.filter(val => !Aid.includes(val));
    b.forEach(function (f) {
        if(a.find(e=>e===f)){
                onlyInB.push(f)
        }
    })
    add.forEach(function (f) {
        if(b.find(e=>e===f)){
            onlyInB.push(b.find(e=>e===f))
        }
    })
    //console.log(onlyInB)
 
    return onlyInB;
}
function getFriends(id,callback) {
    let friends=[];
    let followers=[]
    let result=[]
 
    db.query('SELECT * FROM Followers WHERE user_id=? OR fid=?', [id,id], function (err, flwrs) {
        console.log(err)
        if (flwrs.length > 0) {
            flwrs.forEach(function (u) {
                if(flwrs.find(f=>f.fid==u.user_id)){
                    result.push(flwrs.find(f=>f.fid==u.user_id))
                }
            })
            result=result.filter(i=>i.fid!==id)
      
            callback(result)
        }
    })
}

function getLikes(posts,callback) {
    
    let result=[]
    posts.forEach(function (p) {
        
        db.query('SELECT * FROM Likes WHERE post_id=? ', p.id, function (err, likes) {
            result=[]
            if (likes.length > 0) {
                likes.forEach(function (u) {
                    result.push(u)
                })
                
               
                p.likes=result.length
            }else {
                p.likes=0
            }
            
            callback(posts)
        })
        
    })
    
}

function clickLike(owner_id,post_id,callback) {
    let like_obj={
        id:ID(13),
        owner_id:owner_id,
        post_id:post_id,
    }
    db.query(`SELECT * FROM Likes WHERE owner_id=? AND post_id=?`,[owner_id,post_id],function (err,likes) {
        if (likes.length == 0){
            db.query(`INSERT INTO Likes SET ?`, like_obj, function (err, resp) {
                console.log('new like request');
                console.log(err)
                console.log(this.sql)
                callback(likes.length+1)
            });
        }else{
            db.query(`DELETE FROM Likes Where owner_id=? AND post_id=?`, [owner_id, post_id], function (err, resp) {
                console.log('new dislike request');
                console.log(err)
                console.log(this.sql)
                callback(likes.length-1)
            });
         }
      
    })
   
}
function setLogo(user_id,url) {
   
    db.query('UPDATE Users SET logo_url=? WHERE id=?',[url,user_id],function (err,p) {
        console.log(err)
    })
}
function storeMessage(msg,room_id,owner_id) {let date = new Date().toISOString().slice(0, 19).replace('T', ' ')
   let obj={
       id:ID(25),
       room_id:room_id,
       owner_id:owner_id,
       text:msg,
       sendDate:date
   }
   
    db.query('INSERT INTO Messages SET ?',obj, function (err, posts) {
    console.log(err)
        db.query('UPDATE Chatrooms SET sendDate=?, lastSaid=? WHERE id=?',[date,obj.id,room_id],function (err,p) {
            console.log(err)
        })
    })
}

function createChatRoom(userlist) {
    let id=ID(40)
   console.info('generate chat')
    let params = userlist.map(function (u) {
        return "'"+u+"'"
    })
    
    db.query(`SELECT * FROM Chatrooms WHERE user_id IN (${params.join(', ')}) GROUP BY id HAVING count(*) > 1`,params,function (err,found) {
        console.log(err)
        console.log('not found any rooms\n'+this.sql)
        
        if(found.length>0){
            console.log('room exists ')
            console.log(found)
            
        }else{
            getMultiUserS(userlist,function (list) {
    
            list.forEach(function (l) {
                let name = list.map(n=>n.name).join(', ');
        
                let multi_room={
                    id:id,
                    user_id:l.id,
                    name: name
                }
                db.query('INSERT INTO Chatrooms SET ? ON DUPLICATE KEY UPDATE user_id=user_id', multi_room, function (err, posts) {
                    console.log(err)
                    console.log('created chatroom')
                })
            })
        })}
    })
    

    
}
function getMessages(room_id,callback) {
    
    db.query('SELECT * FROM Messages WHERE room_id=?',room_id, function (err, messages) {
       
        callback(messages)
    })
    
}
function getChatrooms(user_id,callback) {
 
    db.query('SELECT * FROM Chatrooms WHERE user_id=? ORDER BY sendDate DESC',user_id, function (err, chatrooms) {
        let rooms=[]
        chatrooms.forEach(function (cr,i) {
            db.query('SELECT * FROM Chatrooms WHERE id=?',cr.id, function (err, usersincr) {
                let userData=[]
                if(cr.lastSaid) {
                    db.query('SELECT * FROM Messages WHERE id=?', cr.lastSaid, function (err, lastSaid) {
                        console.log(err)
                        usersincr.forEach(function (u, o) {
                            getUserS(u.user_id, function (data) {
                                console.log(data)
                                console.log(err)
                                userData.push(data)
                                if (o == (usersincr.length - 1)) {
                                    rooms.push({room: cr, users: userData, last: lastSaid})
                                }
                                if (i == (chatrooms.length - 1)) {
                                    callback(rooms)
                                }
                            })
                        })
                    })
                }else{
                    usersincr.forEach(function (u, o) {
                        getUserS(u.user_id, function (data) {
                        
                            console.log(err)
                            userData.push(data)
                            if (o == (usersincr.length - 1)) {
                                rooms.push({room: cr, users: userData, last: ''})
                            }
                            if (i == (chatrooms.length - 1)) {
                                callback(rooms)
                            }
                        })
                    })
                }
                
                
            })
            
        })
        
    })
    
}
function getPosts(user_id,from,to,callback) {
    
    let result=[]
    console.log('posts '+user_id)
    db.query('SELECT * FROM Posts WHERE owner_id=? ORDER BY date DESC', user_id, function (err, posts) {
        console.log(err)
        if (posts.length > 0) {
      
            posts.forEach(function (u,i) {
                if((i>=from)&&(i<=to)) {
                    let dir = path.join(__dirname, `public/uploads/${user_id}/${u.id}`)
                    let p = {files: []}
                    Object.keys(u).forEach(function (o) {
                        p[o] = u[o]
                    })
                    db.query('SELECT * FROM Pfiles WHERE post_id=?', u.id, function (err, pfiles) {
                        console.log(err)
                       // console.log(pfiles)
                        pfiles.forEach(function (pf) {
                            p.files.push(pf.file_uri)
                        })
                    })
                    result.push(p)
                    
                }
                callback(result);
           
            })
            
           
        }
      
    })
    
    
}
function addPostFile(obj) {
    db.query('INSERT INTO Pfiles SET ?', obj, function (err, posts) {
    
    })
}
function addPost(owner_id,text,files,callback) {
    let post_obj={
        id:ID(13),
        owner_id:owner_id,
        text:text,
        storage_id:ID(11)
    }
    db.query(`INSERT INTO Posts SET ?`,post_obj, function (err, resp) {
        console.log('new post request');
        console.log(err)
        console.log(this.sql)
        callback(post_obj.id)
    });
}

function addFriend(user_id,friend_id) {
    
    if(user_id&&friend_id) {
 
        let request = {
            user_id: user_id,
            fid: friend_id
        }
        db.query('SELECT * FROM Followers WHERE user_id=? AND fid=?', [user_id,friend_id], function (err, rs) {
            if (rs.length == 0) {
                db.query(`INSERT INTO Followers (user_id,fid) VALUES ('${user_id}','${friend_id}')`, function (err, resp) {
                    console.log('new friend request');
                    console.log(err)
                    console.log(this.sql)
                });
            }
        })
       
    }else{ console.log('err friend request');}
}
function getUserS(user_id,callback) {

    let user={};

    if(user_id) {

        db.query('SELECT * FROM Users WHERE id=?', user_id, function (err, rs) {
            if (err) throw err;
            //console.log(this.sql);
        
            if (rs.length > 0) {
                
                user.status=rs[0].status;
                user.id=rs[0].id;
                user.name = rs[0].name;
                user.logo = rs[0].logo_url
                user.surname = rs[0].surname;
                user.patronymic = rs[0].patronymic;
                user.birthdate = rs[0].birthdate;
                //успешный логин админа, отправить страницу
                callback(user);
            }else {
                callback('No such user')
            }
        })
    }
}

function getMultiUserS(id_list,callback) {
    let user={}
    let user_list=[];
    let access=['id','name','surname','patronymic','logo_url','status']
    if(id_list) {
        id_list.forEach(function (id,i) {
            console.log(id_list)
            db.query('SELECT * FROM Users WHERE id=?', id, function (err, rs) {
                if (err) throw err;
                //console.log(this.sql);
                
                if (rs.length > 0) {
                    user.id=rs[0].id;
                    user.name=rs[0].name;
                    user.surname=rs[0].surname;
                    user.patronymic=rs[0].patronymic;
                    user.logo_url=rs[0].logo_url;
                    user.status=rs[0].status;
             
                    user_list.push(user)
                    console.log(i+' '+user.id+' '+user_list.length)
                    user={}
                    //успешный логин админа, отправить страницу
                    if(i==(id_list.length-1)){
                        console.log(user_list)
                        callback(user_list);
                       
                    }
                }
            })
        })
        
    }
}
function searchUserS(id,callback) {

    let user=[];
    db.query('SELECT * FROM Users WHERE name=? OR surname=?',[id,id],function (err,rs) {
        if (err) throw err;
        //console.log(this.sql);
        if (rs.length > 0) {
            rs.forEach(function (u) {
                let ob=u;
                ob.email=ob.login=ob.password='';
                user.push(ob)
            })
            //успешный логин админа, отправить страницу
            callback(user);
        }else{
            callback(user);
        }
    })
    
}

function verifyLoginUserS(username,password,callback) { {
    let id=''
    db.query('SELECT * FROM Users WHERE login=? AND password=?', [username, password],function (err, rs) {
        if (err) throw err;
        //console.log(this.sql);

        if (rs.length > 0) {
            
            id=rs[0].id.toString();
            let createSession = {
                login: rs[0].id,
                projectID: rs[0].projectID
            }
            callback(id);
            db.query('INSERT IGNORE INTO sessions SET ? ON DUPLICATE KEY UPDATE login=login', createSession, function (err, resp) {});
        }else{
            callback(id);
        }
        
    })
}}

function createProjectS(name,description,organization) {
    let generateProject={
        id: ID(6),
        name:name,
        description:description,
        org:organization
    }
    db.query('INSERT INTO Project SET ? ON DUPLICATE KEY UPDATE id = id', generateProject, function (err, resp) {
        console.log('new project');
    });
}

function joinProjectS(userID,projectID) {
    let queryString = `SELECT * FROM Users WHERE login=${userID}`;
    db.query(queryString, function (err, user, fields) {
   
        let json = fields.find(e=>e===projectID);
        let pj = JSON.parse(json);
        if(pj.length>0){
            if(!pj.find(e=>e.id===projectID)){
                pj.push({id:projectID});
                db.query('UPDATE Users SET projectID=? WHERE ID=?', [pj,userID])
            }
        }else{
            pj.push({id:projectID});
            db.query('UPDATE Users SET projectID=? WHERE ID=?', [pj,userID])
        }
    })
}

function leaveProjectS(userID,projectID) {
    let queryString = `SELECT * FROM Users WHERE login=${userID}`;
    db.query(queryString, function (err, user, fields) {
        let json = fields.find(e=>e===projectID);
        let pj = JSON.parse(json);
        if(pj.length>0) {
            if (pj.find(e => e.id === projectID)) {
                pj= pj.filter(function( obj ) {
                    return obj.id !== projectID;
                });
                db.query('UPDATE Users SET projectID=? WHERE ID=?', [pj, userID])
            }
        }
    })
}

function updateStatus(status, user_id){

    let queryString = `UPDATE Users SET status =? WHERE id = ?`
    db.query(`UPDATE Users SET status =? WHERE id = ?`, [status, user_id])
}

function createToken(userID,scopes,callback){
    console.log('creating token')
    let token={
        id:ID2(20),
        user_id:userID,
        scopes:JSON.stringify(scopes)
    }
    db.query('INSERT INTO Tokens SET ? ON DUPLICATE KEY UPDATE id=id',token,function (err,verification) {
        console.log(err)
    })
}
let checker = (arr, target) => target.every(v => arr.includes(v));




module.exports = connectDatabase();

createUserS('pavel','Pavel','Keyno','02.06.1970','someemail','12345','')
createUserS('kirill','Kirill','W','02.06.1977','someemail','12345','')
createUserS('paul','Paul','k','02.06.1977','someemail','12345','')
createUserS('ivan','Ivan','k','02.06.1977','someemail','12345','')
module.exports.createUser = createUserS;
module.exports.getUser = getUserS;
module.exports.createChatRoom = createChatRoom
module.exports.searchUser = searchUserS;
module.exports.createProject = createProjectS;
module.exports.joinProject = joinProjectS;
module.exports.leaveProject = leaveProjectS;
module.exports.verifyLoginUser = verifyLoginUserS;
module.exports.addFriend = addFriend;
module.exports.getFriends = getFriends;
module.exports.addPost = addPost;
module.exports.addPostFile = addPostFile;
module.exports.getPosts = getPosts;
module.exports.getLikes = getLikes;
module.exports.clickLike = clickLike;
module.exports.setLogo = setLogo;
module.exports.storeMessage=storeMessage;
module.exports.getMessages=getMessages;
module.exports.getChatrooms=getChatrooms;
module.exports.updateStatus = updateStatus;
module.exports.createToken = createToken;
// module.exports.sessionStore = e_session



