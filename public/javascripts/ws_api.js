
function InitCroppie() {

    $uploadCrop = $('#upload-demo').croppie({
        enableExif: true,
        viewport: {
            width: 200,
            height: 200,
            type: 'square'
        },
        boundary: {
            width: 300,
            height: 300
        }
    });

    $('.upload-result').on('click', function (ev) {
        $uploadCrop.croppie('result', {
            type: 'canvas',
            size: 'viewport'
        }).then(function (resp) {

        });
    });

}
function genUsers(users) {
    let lane=''

    users.forEach(function(x,i){lane+=(`<div class="chat_u watch_profile" value=${x.id} style="position: relative;margin-left: ${5*i}px;"><img class="chat_ulogo" src="${x.logo}"  onerror="this.src='/images/icons/no_avatar.png';"/><div class="chat_uname">${x.name} ${x.surname}</div></div>`)})
    return lane
}
function getLast(users,msg,ui) {
    let user=users.find(e=>e.id==msg.owner_id)
    
    if(!user) return null;
    let lane=(`<div class="chat_u" style="position: relative;margin-left: ${5*ui}px;"><img class="chat_ulogo" src="${user.logo}"  onerror="this.src='/images/icons/no_avatar.png';"/><div class="chat_uname">${user.name}</div><div>${msg.text}</div></div>`)
    return lane
}
$('.upload-result').on('click', function (ev) {
    $uploadCrop.croppie('result', {
        type: 'canvas',
        size: 'original'
    }).then(function (resp) {
        $('#imagebase64').val(resp);
        
    });
});

function genChatI(parent,u,i){
    localStorage.setItem(u.room.id,JSON.stringify(u.users))
    let chat_name=$(createEl('label')).addClass('chat_name u_id').attr('value',u.room.id).text(u.room.name)
    let ulist=$(createEl('div')).addClass('chat_ulist').html(genUsers(u.users))
    let chat_bar=$('<div></div>').addClass('chat_bar')

    let last_said=$(createEl('div')).addClass('last_said').html(getLast(u.users, u.last, i))
    let chat_item=$(createEl('div')).addClass('chat_item').attr('loaded','false').attr('data-ref',u.room.id)
    chat_bar.append(chat_name).append(ulist)
    chat_item.append(chat_bar).append(last_said)
    parent.append(chat_item)

}

function createEl(tag) {
    return document.createElement(tag);
}

let WSApi={
  
    'WSReceive':()=>{
    ws.on('messages',function (msg) {
        let json=JSON.parse(localStorage.getItem(msg.room_id));
        console.log(json)
        msg.data.forEach(function (m) {
            let float=m.owner_id==msg.owner?'right':'left'
            let f = m.owner_id==msg.owner?'left':'right'
            
            let date = new Date(m.sendDate)
            let offset = new Date().getTimezoneOffset();
            
            let hours = date.getHours()-(offset/60)
            let minutes =date.getMinutes()
            let time=hours+':'+minutes


            let user=json.find(e=>e.id==m.owner_id)

            let you = m.owner_id==msg.owner?('You'):(user.name)
            $(`#chat_msgs`).append(`<div class="msg_item"><div style="float: ${float}"><div style="float: ${float}">${you} <img class="msg_ulogo"  src="${user.logo}"  onerror="this.src='/images/icons/no_avatar.png';"/> <sub>${time}</sub></div><div style="float: ${f};clear: both">${m.text}</div></div></div>`)
        })
        $('#chat_msgs').stop().animate({
            scrollTop: $('#chat_msgs').height(),
            
        },{
            duration:100,
            complete:function () {
            
            }
        })
    })
    ws.on('msg',function (data) {
        console.log('msg event')
        let now = new Date()
        let time = now.getHours()+':'+now.getMinutes()

        let json=JSON.parse(localStorage.getItem(data.room_id));
        let user=json.find(e=>e.id==localStorage.getItem('profile'))
        
        $('#chat_msgs').append(`<div class="msg_item"><div style="float: left"><div style="float: left">${user.name} <img class="msg_ulogo"  src="${user.logo}"  onerror="this.src='/images/icons/no_avatar.png';"/> <sub>${time}</sub></div><div style="float: right;clear: both">${data.msg}</div></div></div>`)
        $('#chat_msgs').stop().animate({
            scrollTop: $('#chat_msgs').height(),
            
        },{
            duration:100,
            complete:function () {
            
            }
        })
    })
},
    'WSSession':()=>{
        ws.on('connect', function(data) {
        })
        ws.emit("getToken", {token: localStorage.getItem("token") || ""});
    
        ws.on("gotToken", function(message){
            if(message.token != "") {
                localStorage.setItem("token", message.token);
                token = message.token;
                ws.emit('request',{url: url})
            }
        })
    
},
    'WSNavigate':()=>{
        ws.on('loadpage', function (msg) {
            let parse = msg
            $('.ws_view').trig
            document.getElementById('content').innerHTML = parse.page;
            //setTimeout(function () {
            console.log(parse.url)

            Object.keys(parse.info).forEach(function (c) {
                console.log(c)
                if (document.getElementById('display_' + c)) {
                    if(document.getElementById('display_' + c).tagName!='IMG'){
                        document.getElementById('display_' + c).innerHTML = parse.info[c];
                    }else{
                        document.getElementById('display_' + c).src = parse.info[c];
                        console.log(parse.info[c])
                    }
                }
                $('.u_id').val(parse.info['id']);
            })
            if(parse.url=='contacts'){
                ws.emit('load_friends','')
            }
            if(parse.url=='settings'){
                ws.emit('load_api','')
            }
            if(parse.url=='profile'){
                ws.emit('loadfeed',{begin:0,end:5})
            }
            if(parse.url=='watch_profile'){
                ws.emit('loadfeed',{begin:0,end:5,id:parse.info['id']})
            }
        
            if(parse.url=='chats'){
            
                ws.emit('loadchatrooms','')
            }
            if(parse.url=='messages'){
                console.log('checking author field bfore inserting: ' + parse.author)
                $('.display_author').val(parse.author);
            }
        

            history.pushState(null, null, `/${parse.url}`);
        })
    },
    'WSPosts':()=>{
        ws.on('post_list',function (msg) {
        
            let parse= msg
            let myNode = document.getElementById("posts_list");
            while (myNode.firstChild) {
                myNode.removeChild(myNode.firstChild);
            }
        
            if(post_int>0){
                $('#posts_list').append(`<div class="p_prev"><button class="p_prevload">Prev 5</button></div>`)
            }
            parse.data.forEach(function (u) {
                let imgDiv = "<div>";
            
                if (u.files) {
                    //console.log(u.files)
                    u.files.forEach(function (file) {
                        imgDiv+=`<img src="${file}" style="width:300px;height: 300px:display:inline-block"/>`;
                    })
                }
                imgDiv+="</div>"
                let post_div=`<div class="post_item"><h4>${u.text}</h4><button class="like_btn" onclick="ws.emit('liked',{post_id:'${u.id}'})"><i class="material-icons">favorite_border</i></button><div>${imgDiv.toString()}</div><div class="like_count" id="like_${u.id}">${u.likes}</div> Liked this</div>`;
                $('#posts_list').append(post_div)
            })
            if((parse.data.length)>4) {
                $('#posts_list').append(`<div class="p_next"><button class="p_nextload">Next 5</button></div>`)
            }
            //document.getElementById('search_list').innerHTML = parse.data.page;
        })
        ws.on('published',function () {
        
            console.log('storage reset')
            //formData.delete('images[]')
            $('#image-input').val('')
            $('#clk_back').css('display','none')
            $('.over_back').css('display','none')
            document.getElementById("image-input").value = ""
            $('#post_form_text').text("")
            let myNode = document.getElementById("post_form_images");
            if(myNode.hasChildNodes()){
                while (myNode.firstChild) {
                    myNode.removeChild(myNode.firstChild);
                }
            }
            ws.emit('loadfeed',{begin:0,end:5})
        
        })
    },
    'WSChatrooms':()=>{
        ws.on('chatrooms',function (msg) {
            
            let parse = msg.data;
          
    
            let myNode = document.getElementById("chat_list");
            while (myNode.firstChild) {
                myNode.removeChild(myNode.firstChild);
            }

            parse.forEach(function (u, i) {
                //console.log(u)
                //console.log(i)

                genChatI($('#chat_list'),u,i)
                //$('#chat_list').append(`<div class="chat_item" style="margin-bottom: 50px" data-ref=${u.room.id} loaded="false"><div class="chat_bar"><label class="chat_name u_id" value=${u.room.id}>${u.room.name}</label><div class="chat_ulist" >${genUsers(u.users)}</div></div><br><div class="last_said">${getLast(u.users, u.last,i)}</div></div>`)
            })
        })
    },
    'WSFriends':()=>{
        ws.on('added',function (msg) {
            console.log('added')
        })
    
        ws.on('friend_list',function (msg) {
            let parse= msg;
            console.log(parse)
            let myNode = document.getElementById("friend_list");
            while (myNode.firstChild) {
                myNode.removeChild(myNode.firstChild);
            }
            parse.data.forEach(function (u) {
                $('#friend_list').append(`<div lass="friend_item"><label class="u_id" value=${u.id}>${u.name}</label><br><label>${u.surname}</label><br><label class="status">${u.status}</label><br> <button class="watch_profile" value=${u.id}>Watch Profile</button></div>`)
            })
        
        })
        ws.on('loaded_chat_friends',function (list) {
        
            list.data.forEach(function (u) {
                console.log(u)
                let fullname=u.name+' '+u.surname
                $('.mutliSelect ul').append(`<input type="checkbox" class="add_u" value="${u.id}" name=${fullname}>${fullname}</input>`)
            })
        })
    },
    'WSLikes':()=>{
        ws.on('like_upd',function (data) {

            $(`#like_${data.post_id.toString()}`).text(data.count)
        })
    },
    'WSSettings':()=>{
        ws.on('APIData',function (data) {
            console.log('API')

            console.log(data.data)
            data.data.forEach(function (u,i) {


                $('.APIMultiselect>select').append(`<option value="${u}">${u}</option>`)
                if(i==data.data.length-1){

                    $('.APIMultiselect').dropdown({
                        multipleMode: 'label',
                        choice:function () {

                        }
                    });
                }
            })


        })
    },
    'WSSearch':()=>{
        ws.on('found',function (msg) {
            let parse= msg
            let myNode = document.getElementById("search_list");
            while (myNode.firstChild) {
                myNode.removeChild(myNode.firstChild);
            }
            parse.data.forEach(function (u) {
                $('#search_list').append(`<div class="u_profile"><label>${u.name}</label><br><label>${u.surname}</label><br> <button class="watch_profile" value=${u.id}>Watch Profile</button></div>`)
            })
        
        })
    },
    'WSAuth':()=>{
        ws.on('success',function (msg) {
            let parse= msg
            localStorage.setItem('profile',msg.profile)
            if(parse.res=='success'){
                console.log('success')
                ws.emit('request',{url: parse.url})
                ws.emit('loadfeed',{begin:0,end:5})
                history.pushState(null, null, `/${parse.url}`);
            }else if(parse.res=='unsuccess'){
                console.log('unsuccess '+parse.res)
                document.getElementById('exception').innerHTML = parse.res
            }
        })
    
    }
}
let ClickEvents={
    '.chat_item':(ev)=>{
        let ws=ev.data.ws;
        let $this = ev.data.this
        let room_id=$this.data('ref');
        let chat_stat=$this.attr('loaded');

        if(chat_stat=="false"){
            ws.emit('join',{room_id:room_id})
            $('.msg_temp').remove();
            
            $this.append(`<div id="chat_msgs" class="msg_temp"></div><input type="text" id="messageText" class="msg_temp" style="height: auto;width: 500px;word-wrap: break-word;word-break: break-all; max-height: 90px" placeholder="type message here"><button id="sendMessage" class="msg_temp" value=${room_id}><span>Send</span></button>`)
            $('.chat_item').attr('loaded',"false");
            
            
            $this.attr('loaded',"true");
        }
        
        let h =$this.height()/4
        // let top = $this.offset().top;
        let currentScroll = $('#chat_list').scrollTop();

        $('#chat_list').stop().animate({
            scrollTop: currentScroll-150,
            
        },{
            duration:100,
            complete:function () {
                $('.chat_item').css('height','120px');
                $this.css('height','600px');
                $('.chat_item').children('.chat_msgs').css('display','none');
                $this.children('.chat_msgs').css('display','block');
            }
        })
    },
    '#sendMessage':(ev)=>{
        let ws=ev.data.ws;
        let tts=$('#messageText').val();
        let rts=$('#sendMessage').val();
        console.log(ws)
        console.log('clicking on sendMessage, it contains uid: ' + tts + ' sending to: ' + rts);
        let now = new Date()

        let time = now.getHours()+':'+now.getMinutes()
        let json=JSON.parse(localStorage.getItem(rts));
        let user=json.find(e=>e.id==localStorage.getItem('profile'))

        
        $('#chat_msgs').append(`<div class="msg_item"><div style="float: right"><div style="float: right">You <img class="msg_ulogo"  src="${user.logo}"  onerror="this.src='/images/icons/no_avatar.png';"/> <sub>${time}</sub></div><div style="float:left;clear:both">${$('#messageText').val()}</div><div></div>`)
        ws.emit('sendMsg', {text:tts,room_id:rts})
        $('#messageText').val('');
        $('#chat_msgs').stop().animate({
            scrollTop: $('#chat_msgs').height(),
            
        },{
            duration:100,
            complete:function () {

            }
        })
    },
    '#createMulti':(ev)=>{
        let ws=ev.data.ws;
        let arr=ev.data.this.val().split(',')
        ws.emit('beginChat', {id:arr})
    },
    '#generateToken':(ev)=>{
        var arr=[]
        var selected=$(".APIMultiselect>select option:selected")

        selected.each(function(u,i) {

            arr.push(this.value)
            if(arr.length==selected.length){
                ws.emit('generateToken', {perms:arr})
            }
        });


    },
    '#post_form_publish':(ev)=>{
        let ws=ev.data.ws;
        let post = new Post()
        post.setText($('#post_form_text').text())
        let names=[]
        //$('#image-input').prop('files').filter(x=>names.push(x.name))
        console.log(names)
        //post.setFiles(names)
        ws.emit('publish', {data: post.getObj()})
    },
    '#add_friend':(ev)=>{
        let ws=ev.data.ws;
        console.log('add profile '+ev.data.this.val())
        ws.emit('add_friend',{id:ev.data.this.val()})
    },
    '.watch_profile':(ev)=>{
        let ws=ev.data.ws;
        console.log('profile '+ev.data.this.val())
        ws.emit('request',{url: 'watch_profile',id:ev.data.this.val()})
    },
    '#btnLogin':(ev)=>{
        let ws=ev.data.ws;
        console.log('login '+ $('#txtLogin').val())
        ws.emit('auth',{username:$('#txtLogin').val(),password:$('#txtPassword').val()})
    },
    '#startChat':(ev)=>{
        let ws=ev.data.ws;
        ws.emit('beginChat', {id:[ev.data.this.val()]})
        console.log('new chat '+ev.data.this.val())
        ws.emit('request',{url: 'chats',id:ev.data.this.val()})
    },
    '#_post':(ev)=>{
        $('#post_form').css('display', 'block')
        $('#post_form_text').focus()
    },
    '#logout':(ev)=>{
        let ws=ev.data.ws;
        ws.emit('logout')
        ws.emit('request',{url: 'login'})
    },
    '#avatar-input':(ev)=>{
        let ws=ev.data.ws;
        let reader = new FileReader();
        reader.onload = function (e) {
            $uploadCrop.croppie('bind', {
                url: e.target.result
            }).then(function(){
                console.log('jQuery bind complete');
            });
            
        }
        reader.readAsDataURL(ev.data.this.files[0]);
    },
    '.mutliSelect input[type="checkbox"]':(ev)=>{
        let ws=ev.data.ws;
        let title = $(this).closest('.mutliSelect').find('input[type="checkbox"]').attr('name')
            //title = $(this).attr('name') + ",";
        
        if ($(this).is(':checked')) {
            let html = '<span title="' + title + '">' + title + '</span>';
            $('.multiSel').append(html);
            $(".hida").hide();
        } else {
            $('span[title="' + title + '"]').remove();
            let ret = $(".hida");
            $('.dropdown dt #cl').append(ret);
            
        }
    }
}
function InitWS(ws) {
    Object.keys(WSApi).forEach(function (Module) {
       WSApi[Module].apply(null, ws)
    })
   
    Object.keys(ClickEvents).forEach(function (Clk) {
        $('body').on('click', Clk,function () {
            ClickEvents[Clk]({data:{'ws':ws,'this':$(Clk)}});
        })
    })
//    InitCroppie();
  
   
}

