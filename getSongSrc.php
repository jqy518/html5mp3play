<?php
  extract($_GET);
if(isset($base) && !empty($base)){
  $my_file =  file_get_contents($base);
  //$data=base64_encode($my_file);//用base64对字符串编码
  echo $my_file;//发送
}
?>