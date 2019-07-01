let con = require('./db.js')

let fs = require('fs');
let express = require('express')

let router = express.Router()
let bodyParser = require('body-parser');

let cookieParser = require("cookie-parser");

router.use(cookieParser());

router.use(bodyParser.json());


function cbt(a,cb){
    cb('thats')
}

let APIScopes= {
    "getChatrooms": {
        description:'getting this',
        scopes:['user_read']
    },
    "getMessages":{
        description:'getting this',
        scopes:['user_read']
    },
    "getPosts": {
        description:'getting that',
        scopes:["post_read"]
    },
    "getUser": {
        description:'getting user',
        scopes:['user_read']
        // ,params: ['id','token'],
        // method: function (params) {
        //     return new Promise((resolve, reject) => {
        //         con.getUser(params.id,function (user) {
        //
        //             if(user){
        //                 return resolve(user)
        //
        //             }else{
        //                 return resolve('No such user')
        //             }
        //
        //         })
        //
        //     })
        // }
    },
    "getFriends": {
        description:'getting project',
        scopes:['user_read']

    },
    "APIData":{
        description:'All methods of API',
        scopes:[]

    }

}


//experimental

let STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
let ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    let fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if(result === null)
        result = [];
    return result;
}

let conRoutes={}

function splitValue(value, index) {
    let res=[]
    res.push(value.substring(0, index))
    res.push(value.substring(index))
    return res;
}


Object.keys(con).forEach(function (key) {
    if ((typeof con[key] === 'function')&&APIScopes[key]) {
        // do something
        conRoutes[key]={}
        let upper = key.match('([A-Z])')

        let des = splitValue(key, key.indexOf(upper[1]));
        des[0] += 's '
        conRoutes[key].description = des.join('')
        conRoutes[key].scopes = APIScopes[key].scopes;
        conRoutes[key].params = ['token'];
        let params = getParamNames(con[key])
        params.forEach(param=>{
            if(param!='callback'){
                conRoutes[key].params.push(param)
            }
        })

        conRoutes[key].method = function (params) {
            return new Promise((resolve, reject) => {
                console.log(key)
                con[key](params, function (data) {

                    if (data) {
                        return resolve(data)
                    } else {

                        return resolve('No data')
                    }

                })
            })
        }
    }
})

let APIRoutes=conRoutes

let methods=Object.keys(APIRoutes).slice(Object.keys(APIRoutes).indexOf('threadId')+1, Object.keys(APIRoutes).length)
let scopes=[]


methods.forEach(x=> APIRoutes[x].scopes.forEach(y=>scopes.push(y))
)
scopes = scopes.filter(function(elem, index, self) {
    return index === self.indexOf(elem);
})
//let scopes=['user_read','user_edit','project_read','send_message','this_read','that_read']
APIRoutes.APIData={scopes:[],params:[],description:''}
//experimental
APIRoutes.APIData.method=function (params) {
    return new Promise((resolve, reject) => {
        let arr = []
        Object.keys(APIRoutes).forEach(function (r, j) {
            if (r !== 'APIData') {
                arr.push({method:r,values:APIRoutes[r].params,description:APIRoutes[r].description})
            }
            if (j == Object.keys(APIRoutes).length - 1) {
                resolve(arr)
            }
        })
    })
}
//dynamic regex for router
let APIRegex = '(^/|^(';
Object.keys(APIRoutes).forEach(function (e,i) {
    //overwrites APIData method
    if(i<Object.keys(APIRoutes).length-1){
        APIRegex+= '\/'+e+'|';
    }else {
        APIRegex+= '\/'+e+'))';
    }
})
console.log(APIRoutes)
function checkToken(params,method,callback){
    if(method!='APIData'){
        con.query('SELECT * FROM Tokens WHERE id=?',params.token,function (err,verification) {
            console.log(err)

            delete params.token;
            if(verification.length>0){
                if(checker(JSON.parse(verification[0].scopes).perms,APIRoutes[method].scopes)){
                    callback({statusCode:1,message:'Success'})
                }else{
                    callback({statusCode:0,message:'Wrong permissions'})
                }
            }else{
                callback({statusCode:0,message:'Bad token'})
            }
        })
    }else{
        callback({statusCode:1,message:'Success'})
    }

}

let checker = (arr, target) => target.every(v => arr.includes(v));

router.get(`${APIRegex}`, function(req, res, next) {
    let params_context=req.query


    let method=req.url.match('\\/(\\w+)\\??')[1]
    //validates token, requires DB
    checkToken(params_context,method,function (data) {
        delete params_context.token;
        APIRoutes[method].params.splice(APIRoutes[method].params.indexOf('token'),1)
        let params=Object.values(params_context)
        if(data.statusCode==1){

            if(checker(APIRoutes[method].params,Object.keys(params_context))){
                console.log(APIRoutes[method].params)
                console.log(params_context)

                APIRoutes[method].method.call(APIRoutes[method].params,params).then(APIData => {
                    data.data=APIData;

                    //res.header("Content-Type",'application/json');
                    //res.json(data)

                    res.json(data);
                }).catch(err => {

                })
            }else {
                res.json('Wrong parameters')
            }
        }else {
            res.json(data)
        }
    })

});

module.exports = router;
module.exports.scopes=scopes
module.exports.APIRoutes=APIRoutes;