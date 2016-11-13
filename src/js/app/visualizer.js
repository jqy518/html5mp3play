define(["jquery","exports","module"],function($,exports,module){
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