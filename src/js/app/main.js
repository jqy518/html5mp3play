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
