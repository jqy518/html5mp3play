module.exports = function(grunt){
  //找出所有自定义模块
  var requireJsModules = [];  
  grunt.file.expand({cwd:"./src/js/app"}, "*.js").forEach( function (file) {  
      requireJsModules.push(file.replace(/\.js$/, ''));
  });


  grunt.initConfig({
    pkg:grunt.file.readJSON('package.json'),
    uglify:{
      options:{
        banner:'/*project:<%=pkg.name%>\nauthor:<%=pkg.author%>\n<%= grunt.template.today("yyyy-mm-dd")%>\n*/',
        sourceMap: true,
        sourceMapName: 'sourcemap.map'
      },
      build:{
        src: 'dest/js/main.js',
        dest: 'dest/js/main.min.js'
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/js/app/*.js'],
      options: {
        globals: {
          jQuery: true,
          curly: true,//大括号包裹(如if单行)
          eqeqeq: false,//对于简单类型，使用===和!==，而不是==和!=
          newcap: true,//对于首字母大写的函数（声明的类），强制使用new
          noarg: true,//禁用arguments.caller和arguments.callee
          sub: false,//对于属性使用aaa.bbb而不是aaa['bbb']
          undef: true,//查找所有未定义变量
          boss: false,// 查找类似与if(a = 0)这样的代码
          node: true //指定运行环境为node.js
        }
      }
    },
        //Sass任务
    sass: {
        //Sass开发选项
        dev: {
            options: {
                style:"expanded"
            },
            files: {
                'dest/css/main.css':'src/css/sass/main.scss'
            }
        },
        //Sass发布选项
        dist: {
            options: {
                style:'compressed'
            },
            files: {
                 'dest/css/main.css':'src/css/sass/main.scss'
            }
        }
    },
    requirejs: { 
      compile:{
        options:{
          baseUrl: "./src/js/",
          shim:{
          "jquery.mCustomScrollbar":["jquery"]
          },
          optimize:"none",//输出文件要不要压缩，要请用“uglify/uglify2”
          mainConfigFile: "./src/js/app/main.js",//入口文件
          name: "./app/main",//输出模块（包含相关依赖）（如果有多个输出模块请用modules）
          exclude: ["jquery","jquery.mCustomScrollbar"],//排除相关依赖
          out: "./dest/js/main.js"        
        }
      }        
    },
    watch: {
      options: {
        dateFormat: function(time) {
          grunt.log.writeln('The watch finished in ' + time + 'ms at' + (new Date()).toString());
          grunt.log.writeln('Waiting for more changes...');
        },
      },
      scripts: {
        files: './src/js/**/*.js',
        //tasks: ['jshint','requirejs','uglify'],
        tasks: ['jshint','requirejs'],
      },
      css: {
        files: './src/css/**/*.scss',
        tasks: ['sass:dev'],
        options: {
          livereload: true,
        },
      },
    }
  });
  //sass编译
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.registerTask('dist',[
    'sass:dist' //设置发布版本的Sass编译
    ]);
  //文件压缩
  grunt.loadNpmTasks('grunt-contrib-uglify');
  //代码检验
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  //requireJS
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  //grunt.registerTask('default', ['sass:dev','jshint','requirejs','uglify']);

};