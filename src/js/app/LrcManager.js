define(["exports","module","jquery"],function(exports,module,$){

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