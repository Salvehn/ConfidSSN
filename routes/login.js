var express = require('express');

var app = express();
var expressWs = require('express-ws')(app);
var con = require('../db.js')
var session = require('express-session');
var bodyParser = require('body-parser');
var router = express.Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: true}));

router.use(session({
    secret: 'test',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly:false,idv:'' }
    
}));

router.get(`/`, function(req, res, next) {
    res.render('login', { title: 'Auth' });
});
router.post('/',function (req,res,next) {
      // con.verifyLoginUser(req.body.username,req.body.password,function(_id){
      //           var id = _id;
      //           console.log('post '+id)
      //           if(id!==''){
      //
      //               res.redirect('/profile');
      //               req.session.idv=id;
      //
      //
      //           }else {
      //               res.render('login', { title: 'Login' ,exception:'Неверный логин/пароль'  });
      //
      //           }
      //
      //       })
    
    con.verifyLoginUser(req.body.username,req.body.password,function (f) {
        req.session.idv=f
        console.log('reqsssss '+req.session.idv)
        if(f!==''){
            res.redirect('/profile')
        }else{
            console.log('no such user')
        }
        
    })
    // con.query('SELECT * FROM Users WHERE login=? AND password=?', [req.body.username,req.body.password],function (err, rs) {
    //     if (err) throw err;
    //     //console.log(this.sql);
    //
    //     if (rs.length > 0) {
    //
    //         res.redirect('/profile');
    //         req.session.idv=rs[0].id.toString();
    //         console.log('rs ' + rs[0].id)
    //         var createSession = {
    //             login: rs[0].id,
    //             projectID: rs[0].projectID
    //         }
    //
    //         con.query('INSERT IGNORE INTO sessions SET ? ON DUPLICATE KEY UPDATE login=login', createSession, function (err, resp) {});
    //     }else{
    //         res.render('login', { title: 'Login' ,exception:'Неверный логин/пароль'  });
    //     }
    //
    // })
   
    //req.session.idv='zzsyom5wd';
    
})

module.exports = router;