define(["require","visualizer","lrcmanager","jquery.mCustomScrollbar","jquery","exports","module"],function(require,visualizer,lrcmanager,mCustomScrollbar,$,exports,module){
    var playList=[
      {
        fileHead:100,
        singerName :"韩红",
        fileName:"韩红 - 天之大",
        url:"http://fs.open.kugou.com/fc8b84dd590665bda56d9bf862fdf072/5827b693/G072/M02/06/07/KJQEAFdUViWAPaBSAEflpT31pcw807.mp3",
        //url:"http:\/\/fs.open.kugou.com\/535c5d8dd2766ac38cb8393eaa805f7a\/58228f3d\/G005\/M03\/1D\/13\/RQ0DAFS-rTGAVmePAC9Nz1umW20661.mp3",
        imgUrl:"http:\/\/singerimg.kugou.com\/uploadpic\/softhead\/{size}\/20160629\/20160629120333920437.jpg",
        "timeLength":294
      }
    ],
    loveArr=[],
    curIndex=0,//当前歌曲的index;
    audioTotalTime=0,//当前歌曲的总时间;
    playerTimer=null,//播放定时器；
    $playBtn=$("#playButn"),//播放按钮
    $nextBtn=$("#nextButn"),//下一首
    $prevBtn=$("#prevButn"),//上一首
    $typeBtn=$("#typeButn"),//播放类型
    $audio=null,//audio DOM元素;
    isendLoad=false,//是否结束加载。
    $playtype="order";//播放类型；order:顺序播放，refresh:单曲播放，random：随即播放


    function setprogress(aEle,num,n){      
      var Rdeg = num > n ? n : num,
          Ldeg = num > n ? num - n : 0;
      aEle.find(".right div").css("transform","rotateZ("+ (360/(2*n)*Rdeg-180) +"deg)");
      aEle.find(".left div").css("transform","rotateZ("+ (360/(2*n)*Ldeg-180) +"deg)");
    }
    function changSong(data){//设置当前歌曲数据
      stopCurSong(1);
      playList[0] = data;
      loadSong();
    }
    function playerInit(){//初始化
        bindEvent();
        loadSong();

    }
    function saveMyLove(_data){
      function noeq(item){
        return item.hash!=_data.hash;
      }
      if(localStorage.mylove && localStorage.mylove!==""){
          var loveArr = JSON.parse(localStorage.mylove);
          if(loveArr.every(noeq)){
            loveArr.push(_data);
            localStorage.mylove = JSON.stringify(loveArr);
            loadLovelist();
          }else{
            return;
          }
      }else{
        localStorage.mylove = JSON.stringify([_data]);
      }
    }
    function loadLovelist(){
      if(localStorage.mylove && localStorage.mylove!==""){
        var loveArr = JSON.parse(localStorage.mylove);
        var strArr= [];
        loveArr.forEach(function(item){
          strArr.push("<li data-hash='"+item.hash+"'><span>"+item.filename+"</span><i class='icon-minus'></i></li>");
        });
        $(".loveList").empty().html(strArr.join(""));
      }else{
        $(".loveList").empty().html("<li class='nomatch'><i class='icon-github-alt'></i>你还木有收藏喜欢的歌</li>");
      }
    }
    function prve_nextBtnControl(){//控制上下首按钮
      var currIndex = $(".ul_list li").index($(".ul_list li.liactive"));
      if(currIndex+1>=$(".ul_list li").size()){
        $nextBtn.css({"color":"#666","cursor":"not-allowed"});
        $nextBtn.addClass("disabled");
      }else{
        $nextBtn.css({"color":"#fff","cursor":"pointer"});
        $nextBtn.removeClass("disabled");
      }
      if(currIndex===0){
        $prevBtn.css({"color":"#666","cursor":"not-allowed"});
        $prevBtn.addClass("disabled");
      }else{
        $prevBtn.css({"color":"#fff","cursor":"pointer"});
        $prevBtn.removeClass("disabled");
      }
    }
    function bindEvent(){//绑定事件
        $playBtn.on("click",function(){
          if($("#p_icon").hasClass("icon-play")){
            player.play();
          }else{
            player.pause();
          }
        });
        $nextBtn.on("click",function(){
          if($(this).hasClass("disabled")){
            return;
          }
          player.next();
        });
        $prevBtn.on("click",function(){
          if($(this).hasClass("disabled")){
            return;
          }
          player.prev();
        });

        $typeBtn.on("click",function(){
            if($(this).hasClass("icon-indent-right")){
              $(this).removeClass("icon-indent-right").addClass("icon-refresh");
              $playtype="refresh";
            }else if($(this).hasClass("icon-refresh")){
              $(this).removeClass("icon-refresh").addClass("icon-random");
              $playtype="random";
            }else if($(this).hasClass("icon-random")){
              $(this).removeClass("icon-random").addClass("icon-indent-right");
              $playtype="order";
            }
        });

    }
    function loadSong(i){//加载歌曲
      loadStyle(false);
      var source = playList[(i||curIndex)];
      if(i){
      curIndex = i;
      }
      var _audio = $("<audio id='playerAudio' preload='auto'></audio>");
      _audio.append("<source src='"+source.url+"'></source>");
      $("#audioContainer").empty().append(_audio);
       $audio =_audio.get(0); 
       bindAudioEvents($audio);
       $audio.load();
       changCover();//封面信息
       visualizer.init(source.url,loadStyle,1);//音频视觉效果
       lrcmanager.init(source,$audio);//歌词
    }
    function changCover(){
      var size = playList[curIndex].fileHead;
      var src = playList[curIndex].imgUrl.replace(/\{size\}/g,size);
      $(".coverImg").attr("src",src);
      $(".songinfo .info dt").text(playList[curIndex].fileName);
      $(".songinfo .info dd").text(playList[curIndex].singerName);
    }
    function stopCurSong(_end){//结束当前歌曲回到起始,_end--真结束，不再解码
        if($audio){
          $audio.pause();
          $audio.currentTime=0;
        }
        if(playerTimer){
        clearInterval(playerTimer);
        }
        setprogress($playBtn,0,50);
        $(".pronum").text("00:00");
        $("#p_icon").removeClass("icon-pause").addClass("icon-play");
        if(_end){
          loadStyle(true);
          visualizer.suspend(null,1);//停止视图,1为不再解码
        }else{
          loadStyle(false);
          visualizer.suspend(loadStyle);////停止视图,再次解码
        }
        lrcmanager.stop();//停止歌词

    }
    function loadStyle(b,index){
      if(!b){       
        $("#p_icon").removeClass().addClass("icon-spinner icon-spin");
      }else{
        $("#p_icon").removeClass().addClass("icon-play");
        if(isendLoad&&$playtype==="refresh"&&index!=1){//循环播放
           player.play();
           isendLoad=false;
        }
      }
      if(index==1){//资源第一次加载完，自动播放。
        player.play();
      }
    }
    function bindAudioEvents(_audio){//audio事件绑定
        _audio.addEventListener("canplay",function(){
          audioTotalTime = this.duration;
          
        },false);
        _audio.addEventListener("ended",songEnd,false);
    }
    function songEnd(){//播放完毕
        isendLoad = true;
        switch($playtype){
          case "order":
          stopCurSong(1);
          $nextBtn.trigger("click");
          break;
          case "refresh":
          stopCurSong();
          break;
          case "random":
          stopCurSong(1);
          break;
        }
        
    }
    function updateProgress(){//更新进度
        if(!$audio){
          return;
        }
        var curTime = $audio.currentTime*1e3|0;
        curTime += 100;
        var progess = curTime / audioTotalTime * 0.1;
        setprogress($playBtn,progess,50);
        $(".pronum").text(getFormatTime(curTime / 1e3));
        
    }
    function getFormatTime(time){//分钟格式转换，传入的是秒数
    var min = '00' + (time / 60 | 0), sec = time % 60;
    sec = '00' + (sec | 0);
    return [min.substr(-2), sec.substr(-2)].join(':');
    }
    var player = {
      play:function(){
        if(playerTimer){
        clearInterval(playerTimer);
        }
        playerTimer = setInterval(updateProgress, 500);
        $audio.play();
        $("#p_icon").removeClass("icon-play").addClass("icon-pause");
        visualizer.resume($audio);//开启音频视图
        lrcmanager.resume();//开启歌词
      },
      pause:function(){
        $audio.pause();
        if(playerTimer){
        clearInterval(playerTimer);
        }
        $("#p_icon").removeClass("icon-pause").addClass("icon-play");
        loadStyle(false);
        visualizer.suspend(loadStyle);
      },
      next:function(){
        $(".ul_list li.liactive").next().find("span").trigger("click");
      },
      prev:function(){
        $(".ul_list li.liactive").prev().find("span").trigger("click");
      }
    };

/*****************Kugou(仅供学习；勿商用)*********************/
function doAJAX(url,args){
  $.ajax({
        url:url,       
        type:'GET',                                //jsonp 类型下只能使用GET,不能用POST,这里不写默认为GET
        dataType:'jsonp',                          
        data:args,                
        jsonp:'callback',                          //服务器端获取回调函数名的key，对应后台有$_GET['callback']='getName';callback是默认值
        jsonpCallback:args.callback,                   //回调函数名
        success:function(result){                  //成功执行处理，对应后台返回的getName(data)方法。
           console.log(result);
        },
        error:function(msg){
            console.log(msg);                 //执行错误
        }
    }); 
}
var Kugou = {
    doSearch: function(q, page, callback, pageSize){
      var data = {
        cmd: 300,
        keyword: encodeURIComponent(q),
        page:1,
        pageSize:20,
        outputtype: 'jsonp',
        callback: callback || 'Kugou.searchBack'
      };
      doAJAX('http://mobilecdn.kugou.com/new/app/i/search.php', data);
    },
    bindEvent: function(){
      var self = this;
      $('#searchBtn').on("click",Kugou.searchEvent);
      $('.ul_list').on("click","span",function(){
        var hash = $(this).closest("li").data("hash");
        $(".ul_list li.liactive").removeClass("liactive");
        $(this).closest("li").addClass("liactive");

        prve_nextBtnControl();
        self.getSongInfo(hash,changSong);
      });
      $('.ul_list').on("click","i",function(){
        var cli = $(this).closest("li");
        var cdata = {"hash":cli.data("hash"),"filename":cli.data("filename")};
        $(this).css("color","#f00");
        saveMyLove(cdata);
      });
      $('.listmenu li').on("click",function(){
        $(".listmenu li.active").removeClass("active");
        $(this).addClass("active");
        var step = $(this).data("side");
        $(".listContainer").stop().animate({"marginLeft":-step*260+"px"});
      });

      prve_nextBtnControl();
    },
    searchEvent: function(e){
      var keyword = $('#keyword').val().trim();
      Kugou.doSearch(keyword);
      return false;
    },
    searchBack: function(json){
      if (json.status) {
        var data = json.data;
        var str = [];
        for (var i = 0, len = data.length; i < len; i++) {
          str.push('<li data-extname="' + data[i].extname + '" data-bitrate="' + data[i].bitrate + '" data-time="' + data[i].timelength + '" data-filename="' + data[i].filename + '" data-hash="' + data[i].hash + '" ><span>' + data[i].filename + '</span><i class="icon-heart"></i></li>');
        }
        str = str.join('');
        $(".searchList").mCustomScrollbar("destroy");
        $('.searchList').html(str);
        $(".searchList").mCustomScrollbar({axis: "y",theme:"dark-3"});
      }
      else {
      //出错
      }
    },
    getSongInfo: function(hash, callback){
      callback = callback || emptyFn;
      $.get("kproxy.php", {
        base:"/app/i/getSongInfo.php",
        "query":encodeURIComponent('cmd=playInfo&hash='+hash)
      },callback,"json");
    }
  };

  function extFun(){
      String.prototype.trim = function() {
          return this.replace(/^\s*|\s*$/g, "");
      };
      window.Kugou = Kugou;
  }
    module.exports={
    	init:function(){
          extFun();
          playerInit();
          Kugou.bindEvent();
          loadLovelist();
    	}
    };
});