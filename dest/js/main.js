define('visualizer',["jquery","exports","module"],function($,exports,module){
    var audioContext=null,
        ispuspend = false,
        bufferSource=null,
        audioBufferSouceNode = null,
        analyser = null,
        source=null;
        v_id="bolt";

      function _prepareAPI() {
        //统一前缀，方便调用
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        //这里顺便也将requestAnimationFrame也打个补丁，后面用来写动画要用
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        //安全地实例化一个AudioContext并赋值到Visualizer的audioContext属性上，方便后面处理音频使用
        try {
            if(!audioContext){
            audioContext = new AudioContext();
            }
        } catch (e) {
            console.log('!妳的浏览器不支持AudioContext:(');
            console.log(e);
        }
      }
      function loadSource(src,cb,index){
        var request = new XMLHttpRequest(); //建立一个请求
        var url = "getSongsrc.php?base="+encodeURI(src);
        request.open('GET', url, true); //配置好请求类型，文件路径等
        request.responseType = 'arraybuffer'; //配置数据返回类型
        // 一旦获取完成，对音频进行进一步操作，比如解码
        request.onload = function() {
            bufferSource = request.response;
            decode(bufferSource,cb,index);//开始解码
        };
        request.send();
      }
      function decode(arraybuffer,cb,index){
            audioContext.decodeAudioData(arraybuffer, function(buffer) {//解码成功则调用此函数，参数buffer为解码后得到的结果
            audioContext.currentTime=0; 
            _visualize(audioContext, buffer,cb,index); //调用_visualize进行下一步处理，此方法在后面定义并实现
        }, function(e) { //这个是解码失败会调用的函数
            console.log("!哎玛，文件解码失败:(");
            if(typeof cb == "function"){
            cb(false);
            }
        });
      }
      function _visualize(audioContext, buffer,cb,index){

        audioBufferSouceNode = audioContext.createBufferSource();
        analyser = audioContext.createAnalyser();
            //将source与分析器连接
           audioBufferSouceNode.connect(analyser);
        //audioBufferSouceNode.connect(audioContext.destination);//连接输出终端
        audioBufferSouceNode.buffer = buffer;
        if(typeof cb == "function"){
            cb(true,index);
        }
      }
      function _drawSpectrum(analyser){
          var canvas = document.getElementById('viscanvas'),

              cwidth = canvas.width,
              cheight = canvas.height - 2,
              meterWidth = 3, //频谱条宽度
              gap = 2, //频谱条间距
              capHeight = 2,
              capStyle = '#fff',
              meterNum = 500 / (3 + 2), //频谱条数量
              capYPositionArray = [], //将上一画面各帽头的位置保存到这个数组
              ctx = canvas.getContext('2d'),
              gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(1, '#00082F');
              gradient.addColorStop(0.5, '#ff0');
              gradient.addColorStop(0, '#f00');
          var drawMeter = function() {
              var array = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(array);
              var step = Math.round(array.length / meterNum); //计算采样步长
              ctx.clearRect(0, 0, cwidth, cheight);
              for (var i = 0; i < meterNum; i++) {
                  var value = array[i * step]; //获取当前能量值
                  if (capYPositionArray.length < Math.round(meterNum)) {
                      capYPositionArray.push(value); //初始化保存帽头位置的数组，将第一个画面的数据压入其中
                  }
                  ctx.fillStyle = capStyle;
                  //开始绘制帽头
                  if (value < capYPositionArray[i]) { //如果当前值小于之前值
                      ctx.fillRect(i * 5, cheight - (--capYPositionArray[i]), meterWidth, capHeight); //则使用前一次保存的值来绘制帽头
                  } else {
                      ctx.fillRect(i * 5, cheight - value, meterWidth, capHeight); //否则使用当前值直接绘制
                      capYPositionArray[i] = value;
                  }
                  //开始绘制频谱条
                  ctx.fillStyle = gradient;
                  ctx.fillRect(i * 5, cheight - value + capHeight, meterWidth, cheight);
                  
              }
              if(!ispuspend){
                requestAnimationFrame(drawMeter);
              }
          };
          requestAnimationFrame(drawMeter);
      }

      function _drawSpectrum2(analyser){
        var canvas = document.getElementById('viscanvas'),
            WIDTH = canvas.width,
            HEIGHT = canvas.height,
            canvasCtx = canvas.getContext('2d');
          analyser.fftSize = 2048;
          var bufferLength = analyser.frequencyBinCount;
          var dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);
          function draw() {
            if(!ispuspend){
            drawVisual = requestAnimationFrame(draw);            
            }
            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
            analyser.getByteTimeDomainData(dataArray);
            canvasCtx.fillStyle = 'rgb(200, 200, 200)';
            //canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = 'rgb(225, 225, 225)';
            canvasCtx.beginPath();
            var sliceWidth = WIDTH * 1.0 / bufferLength;
            var x = 0;
            for(var i = 0; i < bufferLength; i++) {
              var v = dataArray[i] / 128.0;
              var y = v * HEIGHT/2;
              if(i === 0) {
                canvasCtx.moveTo(x, y);
              } else {
                canvasCtx.lineTo(x, y);
              }
              x += sliceWidth;
            }
            canvasCtx.lineTo(canvas.width, canvas.height/2);
            canvasCtx.stroke();
          }
          draw();
      }


      function _suspend(cb,_end){//停止,_end==1,终止（不再解码）
        if(!audioBufferSouceNode){
          return;
        }
        if (!audioBufferSouceNode.stop){
          audioBufferSouceNode.stop = audioBufferSouceNode.noteOff;
        } 
        if(audioBufferSouceNode.playing){
          audioBufferSouceNode.stop();
        }
        ispuspend = true;
        if(_end){
          return;
        }
        decode(bufferSource,cb);
      }
      function _resume(_audio){
        play(_audio);
      }
      function play(_audio){
        if(!audioBufferSouceNode){
          alert("还未解码完。。");
          return;
        }
        audioBufferSouceNode.start(0,_audio.currentTime);//马上开始，偏移_audio.currentTime
        audioBufferSouceNode.playing=  true;
       _audio.play();
       changeVisualizer(v_id);
      }

      function _init(src,cb,index){
        vi_position();
        _prepareAPI();
        loadSource(src,cb,index);
        if(index){
          eventsBind();
        }
      }
      function eventsBind(){
          window.addEventListener('resize', function() {
              vi_position();
          }, false);
          $("#visualizerBar").on("click","li",function(){
              var idname = $(this).attr("id");
              $(this).addClass("active").siblings("li").removeClass("active");
              changeVisualizer(idname);

          });
      }
      function changeVisualizer(_id){
        switch(_id){
                case "bolt" :
                ispuspend = true;
                window.setTimeout(function(){
                  ispuspend = false;
                  _drawSpectrum2(analyser);
                },200);
                v_id = "bolt";
                break;
                case "signal" :
                 ispuspend = true;
                window.setTimeout(function(){
                  ispuspend = false;
                  _drawSpectrum(analyser);
                },200);
                v_id = "signal";
                break;
        }
      }
      function vi_position(){
        var visBox = $('#visBox');
        var w = window.innerWidth;
        var h = window.innerHeight;
        visBox.css({left:(w-visBox.width())/2+"px",top:(h-visBox.height()-100)/2+"px"});

      }
    module.exports={
      init:_init,
      suspend:_suspend,
      resume:_resume
    };
});
define('lrcmanager',["exports","module","jquery"],function(exports,module,$){

    var datas=[];
    var lyricContent = "";
    var lyricBox = $(".lrcBox");
    var lrcline_h = 25;
    var scrollTime = null;
    var $audio = null;
    var currline = 0;
    function loadlrc(source){
      if(localStorage[source.fileName] && localStorage[source.fileName]!==""){
        setLrc(localStorage[source.fileName]);
      }else{
        showLyrics(source,function(result){
          lyricContent = result;
          localStorage[source.fileName]=lyricContent;
          setLrc(lyricContent);
        });
        
      }
    }
    //http://m.kugou.com/app/i/krc.php?cmd=100&keyword=天之大&timelength=294
    function showLyrics(source,cb) {
    var lyricContent = "";
    var keyword = source.fileName;
    var timelength = source.timeLength * 1000;
    $.get("kproxy.php", {
        base:"/app/i/krc.php",
        "query":encodeURIComponent("cmd=100&keyword="+keyword+"&timelength="+timelength+"&q="+(new Date()).getTime())
    },cb,"text");
    }
    function setLrc(data){
      //$(".lrcBox").text(data);
      datas = parseLrc(data);
      var len = datas.arrLyric.length;
      var lrchtml = [];
      lrchtml.push("<ul>");
      if(len===0){
        lrchtml.push("<li>....暂无歌词....</li>");
      }else{
        for(var i=0; i<len;i++){
          var top = lrcline_h-i*lrcline_h;
          lrchtml.push("<li data-top='"+top+"'>"+datas.arrLyric[i]+"</li>");
        }
      }
      lrchtml.push("</ul>");
      lyricBox.html(lrchtml.join(""));
      if(scrollTime){
        clearInterval(scrollTime);
      }
      scrollTime = setInterval(function(){
        DoSync($audio.currentTime);
      },100);
    }
/**
   * 解析lrc
   * @param {Object} lrc
   */
   function parseLrc(lyric) {
        var datajson={
          arrLyric:[],
          arrLyricTime:[]
        };
        var lrc_re = new RegExp('\[[0-9:.]*\]', 'g');
        var lrc_arr = lyric.split('\r\n');
        var lrc_temp = 0;
        var lrc_filter = 0;
        for (var i = 0; i < lrc_arr.length; i++) {
            var lrc_txt = lrc_arr[i].replace(/\[[\w\W]*\]/g, '').trim();
            if (lrc_txt === '') {
                lrc_filter++;
                continue;
            }
            datajson.arrLyric[i - lrc_filter] = lrc_txt;
            while ((lrc_result = lrc_re.exec(lrc_arr[i])) !== null) {
                var lrc_second = parseSecond(lrc_result.toString().replace(/\[|\]/g, ''));
                if (!isNaN(lrc_second)){
                  datajson.arrLyricTime[lrc_temp++] = (i - lrc_filter) + '|' + lrc_second;
                } 
            }
        }
        return datajson;
    }

    function parseSecond(time) {
        try {
            var lrc_arr = time.split(':');
            return parseInt(lrc_arr[0]) * 60 + parseFloat(lrc_arr[1]);
        } catch(ex) {
            return 0;
        }
    }
    function DoSync(curPosition) {
        var lrc_times = datas.arrLyricTime;
        for (var i = 0; i < lrc_times.length; i++) {
            var lrc_arrPre = lrc_times[i].split('|');
            if (i === 0 && curPosition < lrc_arrPre[1]) break;
            if (lrc_times[i + 1] === undefined) {
                setRow(lrc_arrPre[0]);
                break;
            }
            var lrc_arrNext = lrc_times[i + 1].split('|');
            if (curPosition >= lrc_arrPre[1] && curPosition < lrc_arrNext[1]) {
                setRow(lrc_arrPre[0]);
                break;
            }
        }
    }
    function setRow(index){
        if(currline==index){
          return;
        }
        currline=index;
        var currli = lyricBox.find("li").eq(index);
        var top = currli.data("top");
        currli.prev("li").removeClass("cli");
        lyricBox.find("ul").animate({marginTop:top+"px"},100,function(){
          currli.addClass("cli");
        });
    }

    function _init(source,_audio){

      $audio = _audio;
      loadlrc(source);

    }
    function _stop(){
    if(scrollTime){
        clearInterval(scrollTime);
      }
    }
    function _play(){
      if(scrollTime){
        clearInterval(scrollTime);
      }
       scrollTime = setInterval(function(){
        DoSync($audio.currentTime);
      },100);
    }
    module.exports = {
      init:_init,
      stop:_stop,
      resume:_play
    };
});
define('player',["require","visualizer","lrcmanager","jquery.mCustomScrollbar","jquery","exports","module"],function(require,visualizer,lrcmanager,mCustomScrollbar,$,exports,module){
    var playList=[
      {
        fileHead:100,
        singerName :"韩红",
        fileName:"韩红 - 天之大",
        url:"./dest/mp3/tzd.mp3",
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
define('background',["exports","module"],function(exports,module){
  var num = 200;
  var w = window.innerWidth;
  var h = window.innerHeight;
  var max = 100;
  var _x = 0;
  var _y = 0;
  var _z = 150;
  var canvas = null;
  var dtr = function(d) {
    return d * Math.PI / 180;
  };

  var rnd = function() {
    return Math.sin(Math.floor(Math.random() * 360) * Math.PI / 180);
  };
  var dist = function(p1, p2, p3) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
  };

  var cam = {
    obj: {
      x: _x,
      y: _y,
      z: _z
    },
    dest: {
      x: 0,
      y: 0,
      z: 1
    },
    dist: {
      x: 0,
      y: 0,
      z: 200
    },
    ang: {
      cplane: 0,
      splane: 0,
      ctheta: 0,
      stheta: 0
    },
    zoom: 1,
    disp: {
      x: w / 2,
      y: h / 2,
      z: 0
    },
    upd: function() {
      cam.dist.x = cam.dest.x - cam.obj.x;
      cam.dist.y = cam.dest.y - cam.obj.y;
      cam.dist.z = cam.dest.z - cam.obj.z;
      cam.ang.cplane = -cam.dist.z / Math.sqrt(cam.dist.x * cam.dist.x + cam.dist.z * cam.dist.z);
      cam.ang.splane = cam.dist.x / Math.sqrt(cam.dist.x * cam.dist.x + cam.dist.z * cam.dist.z);
      cam.ang.ctheta = Math.sqrt(cam.dist.x * cam.dist.x + cam.dist.z * cam.dist.z) / Math.sqrt(cam.dist.x * cam.dist.x + cam.dist.y * cam.dist.y + cam.dist.z * cam.dist.z);
      cam.ang.stheta = -cam.dist.y / Math.sqrt(cam.dist.x * cam.dist.x + cam.dist.y * cam.dist.y + cam.dist.z * cam.dist.z);
    }
  };

  var trans = {
    parts: {
      sz: function(p, sz) {
        return {
          x: p.x * sz.x,
          y: p.y * sz.y,
          z: p.z * sz.z
        };
      },
      rot: {
        x: function(p, rot) {
          return {
            x: p.x,
            y: p.y * Math.cos(dtr(rot.x)) - p.z * Math.sin(dtr(rot.x)),
            z: p.y * Math.sin(dtr(rot.x)) + p.z * Math.cos(dtr(rot.x))
          };
        },
        y: function(p, rot) {
          return {
            x: p.x * Math.cos(dtr(rot.y)) + p.z * Math.sin(dtr(rot.y)),
            y: p.y,
            z: -p.x * Math.sin(dtr(rot.y)) + p.z * Math.cos(dtr(rot.y))
          };
        },
        z: function(p, rot) {
          return {
            x: p.x * Math.cos(dtr(rot.z)) - p.y * Math.sin(dtr(rot.z)),
            y: p.x * Math.sin(dtr(rot.z)) + p.y * Math.cos(dtr(rot.z)),
            z: p.z
          };
        }
      },
      pos: function(p, pos) {
        return {
          x: p.x + pos.x,
          y: p.y + pos.y,
          z: p.z + pos.z
        };
      }
    },
    pov: {
      plane: function(p) {
        return {
          x: p.x * cam.ang.cplane + p.z * cam.ang.splane,
          y: p.y,
          z: p.x * -cam.ang.splane + p.z * cam.ang.cplane
        };
      },
      theta: function(p) {
        return {
          x: p.x,
          y: p.y * cam.ang.ctheta - p.z * cam.ang.stheta,
          z: p.y * cam.ang.stheta + p.z * cam.ang.ctheta
        };
      },
      set: function(p) {
        return {
          x: p.x - cam.obj.x,
          y: p.y - cam.obj.y,
          z: p.z - cam.obj.z
        };
      }
    },
    persp: function(p) {
      return {
        x: p.x * cam.dist.z / p.z * cam.zoom,
        y: p.y * cam.dist.z / p.z * cam.zoom,
        z: p.z * cam.zoom,
        p: cam.dist.z / p.z
      };
    },
    disp: function(p, disp) {
      return {
        x: p.x + disp.x,
        y: -p.y + disp.y,
        z: p.z + disp.z,
        p: p.p
      };
    },
    steps: function(_obj_, sz, rot, pos, disp) {
      var _args = trans.parts.sz(_obj_, sz);
      _args = trans.parts.rot.x(_args, rot);
      _args = trans.parts.rot.y(_args, rot);
      _args = trans.parts.rot.z(_args, rot);
      _args = trans.parts.pos(_args, pos);
      _args = trans.pov.plane(_args);
      _args = trans.pov.theta(_args);
      _args = trans.pov.set(_args);
      _args = trans.persp(_args);
      _args = trans.disp(_args, disp);
      return _args;
    }
  };
  //Build
   var threeD = function(param) {
    this.transIn = {};
    this.transOut = {};
    this.transIn.vtx = (param.vtx);
    this.transIn.sz = (param.sz);
    this.transIn.rot = (param.rot);
    this.transIn.pos = (param.pos);
  };

  threeD.prototype.vupd = function() {
    this.transOut = trans.steps(

      this.transIn.vtx,
      this.transIn.sz,
      this.transIn.rot,
      this.transIn.pos,
      cam.disp
    );
  };

  var Build = function(canv) {
    this.vel = 0.04;
    this.lim = 360;
    this.diff = 200;
    this.initPos = 100;
    this.toX = _x;
    this.toY = _y;
    this.canvas = canv;
    this.go();
  };

  Build.prototype.go = function() {

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.$ = this.canvas.getContext("2d");
    this.$.globalCompositeOperation = 'source-over';
    this.varr = [];
    this.dist = [];
    this.calc = [];

    for (var i = 0, len = num; i < len; i++) {
      this.add();
    }

    this.rotObj = {
      x: 0,
      y: 0,
      z: 0
    };
    this.objSz = {
      x: w / 5,
      y: h / 5,
      z: w / 5
    };
  };

  Build.prototype.add = function() {
    this.varr.push(new threeD({
      vtx: {
        x: rnd(),
        y: rnd(),
        z: rnd()
      },
      sz: {
        x: 0,
        y: 0,
        z: 0
      },
      rot: {
        x: 20,
        y: -20,
        z: 0
      },
      pos: {
        x: this.diff * Math.sin(360 * Math.random() * Math.PI / 180),
        y: this.diff * Math.sin(360 * Math.random() * Math.PI / 180),
        z: this.diff * Math.sin(360 * Math.random() * Math.PI / 180)
      }
    }));
    this.calc.push({
      x: 360 * Math.random(),
      y: 360 * Math.random(),
      z: 360 * Math.random()
    });
  };

  Build.prototype.upd = function() {
    cam.obj.x += (this.toX - cam.obj.x) * 0.05;
    cam.obj.y += (this.toY - cam.obj.y) * 0.05;
  };

  Build.prototype.draw = function() {
    this.$.clearRect(0, 0, this.canvas.width, this.canvas.height);
    cam.upd();
    this.rotObj.x += 0.1;
    this.rotObj.y += 0.1;
    this.rotObj.z += 0.1;

    for (var i = 0; i < this.varr.length; i++) {
      for (var val in this.calc[i]) {
        if (this.calc[i].hasOwnProperty(val)) {
          this.calc[i][val] += this.vel;
          if (this.calc[i][val] > this.lim) this.calc[i][val] = 0;
        }
      }

      this.varr[i].transIn.pos = {
        x: this.diff * Math.cos(this.calc[i].x * Math.PI / 180),
        y: this.diff * Math.sin(this.calc[i].y * Math.PI / 180),
        z: this.diff * Math.sin(this.calc[i].z * Math.PI / 180)
      };
      this.varr[i].transIn.rot = this.rotObj;
      this.varr[i].transIn.sz = this.objSz;
      this.varr[i].vupd();
      if (this.varr[i].transOut.p < 0) continue;
      var g = this.$.createRadialGradient(this.varr[i].transOut.x, this.varr[i].transOut.y, this.varr[i].transOut.p, this.varr[i].transOut.x, this.varr[i].transOut.y, this.varr[i].transOut.p * 2);
      this.$.globalCompositeOperation = 'lighter';
      g.addColorStop(0, 'hsla(255, 255%, 255%, 1)');
      g.addColorStop(0.5, 'hsla(' + (i + 2) + ',85%, 40%,1)');
      g.addColorStop(1, 'hsla(' + (i) + ',85%, 40%,.5)');
      this.$.fillStyle = g;
      this.$.beginPath();
      this.$.arc(this.varr[i].transOut.x, this.varr[i].transOut.y, this.varr[i].transOut.p * 2, 0, Math.PI * 2, false);
      this.$.fill();
      this.$.closePath();
    }
  };
  Build.prototype.anim = function() {
    window.requestAnimationFrame = (function() {
      return window.requestAnimationFrame ||
        function(callback, element) {
          window.setTimeout(callback, 1000 / 60);
        };
    })();
    var anim = function() {
      this.upd();
      this.draw();
      window.requestAnimationFrame(anim);
    }.bind(this);
    window.requestAnimationFrame(anim);
  };

  Build.prototype.run = function() {
    this.anim();

    window.addEventListener('mousemove', function(e) {
      this.toX = (e.clientX - this.canvas.width / 2) * -0.8;
      this.toY = (e.clientY - this.canvas.height / 2) * 0.8;
    }.bind(this));
    window.addEventListener('touchmove', function(e) {
      e.preventDefault();
      this.toX = (e.touches[0].clientX - this.canvas.width / 2) * -0.8;
      this.toY = (e.touches[0].clientY - this.canvas.height / 2) * 0.8;
    }.bind(this));
    window.addEventListener('mousedown', function(e) {
      for (var i = 0; i < 100; i++) {
        this.add();
      }
    }.bind(this));
    window.addEventListener('touchstart', function(e) {
      e.preventDefault();
      for (var i = 0; i < 100; i++) {
        this.add();
      }
    }.bind(this));
  };
  module.exports={
    init:function(){
      canvas = document.getElementById("bgcanv");
      var app = new Build(canvas);
      app.run();
      window.addEventListener('resize', function() {
        canvas.width = w = window.innerWidth;
        canvas.height = h = window.innerHeight;
      }, false);
    }
  };
});
require.config({
  paths:{
    "jquery":"../../dest/js/lib/jquery-1.9.1.min",
    "background":"./app/background",
    "player":"./app/player",
    "visualizer":"./app/visualizer",
    "lrcmanager":"./app/LrcManager",
    "jquery.mCustomScrollbar":'../../dest/js/lib/mCustomScrollbar.concat.min'
  },
  shim:{
    "jquery.mCustomScrollbar":["jquery"]
  }
});

require(["require","jquery","player","background"],function(require,$,player,background){
  //background.init();//背景初始化。
  player.init();//播放器
});

define("app/main", function(){});

