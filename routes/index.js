
var con = require('../db.js')
var fs = require('fs');
var express = require('express')
var active = require('../hosts/active.json')
var host = require('../hosts/hosts.json')
var h = host[active.active]
var router = express.Router()

var formidable = require('formidable')

/* GET home page. */

var bodyParser = require('body-parser');

var cookieParser = require("cookie-parser");

router.use(cookieParser());

router.use(bodyParser.json());


var routes={
    "login":{"url":"./views/ws/login.html"},
    "search":{"url":"./views/ws/search.html"},
    "contacts":{"url":"./views/ws/friends.html"},
    "profile":{"url":"./views/ws/profile.html"},
    "watch_profile":{"url":"./views/ws/view_profile.html"},
    "chats":{"url":"./views/ws/chats.html"},
    "settings":{"url":"./views/ws/settings.html"}
}
var regex = '(^/|^('
Object.keys(routes).forEach(function (e,i) {
if(i<Object.keys(routes).length-1){
    regex+= '\/'+e+'|';
}else {
    regex+= '\/'+e+'))';
}})



router.get(`${regex}`, function(req, res, next) {
    console.log(req.session)
    res.render('index', { title: 'ConfID SSN',host:h.host})
   
});




module.exports = router;
