/**
 * 热更新服务端的主要逻辑
 */
const path = require("path");
const http = require("http");
const express = require("express");
// 可以根据文件后缀，生成相应的Content-Type类型
const mime = require("mime");
// 通过它和http实现websocket服务端
const socket = require("socket.io");
// 内存文件系统，主要目的就是将编译后的文件打包到内存
const MemoryFileSystem = require("memory-fs");
// 更改入口文件
const updateCompiler = require("./updateCompiler");

class Server {
    constructor(compiler) {
        // 将webpack实例挂载到this上
        this.compiler = compiler;
        // 每次编译的hash
        this.currentHash = 0;
        // 所有的websocket客户端
        this.clientSocketList = [];
        // 会指向内存文件系统
        this.fs = null;
        // webserver服务器
        this.server = null;
        // express实例
        this.app = null;
        // webpack-dev-middleware返回的express中间件，用于返回编译的文件
        this.middleware = null;

        // 【3】entry 增加 websocket 客户端的两个文件，让其一同打包到chunk中
        updateCompiler(compiler);

        // 【4】添加webpack的done事件回调，编译完成时会触发；编译完成时向客户端发送消息，通过websocket向所有的websocket客户端发送两个事件，告知浏览器来拉取新的代码了
        this.setupHooks();
        // 【5】创建express实例app
        this.setupApp();
        // 【6】里面就是webpack-dev-middlerware完成的工作，主要是本地文件的监听、启动webpack编译、设置文件系统为内存文件系统（让编译输出到内存中）、里面有一个中间件负责返回编译的文件
        this.setupDevMiddleware();
        // 【7】app中使用webpack-dev-middlerware返回的中间件
        this.routes();
        // 【8】创建webserver服务器，让浏览器可以访问编译的文件
        this.createServer();
        // 【9】创建websocket服务器，监听connection事件，将所有的websocket客户端存起来，同时通过发送hash事件，将最新一次的编译hash传给客户端
        this.createSocketServer();
    }
    /**
     * 添加webpack的done事件回调
     */
    setupHooks() {
        let { compiler } = this;
        compiler.hooks.done.tap("webpack-dev-server", (stats) => {
            //每次编译都会产生一个唯一的hash值
            this.currentHash = stats.hash;
            //每当新一个编译完成后都会向所有的websocket客户端发送消息
            this.clientSocketList.forEach(socket => {
                //先向客户端发送最新的hash值
                socket.emit("hash", this.currentHash);
                //再向客户端发送一个ok
                socket.emit("ok");
            });
        });
    }
    /**
     * 创建express实例app
     */
    setupApp() {
        this.app = new express();
    }
    /**
     * 添加webpack-dev-middleware中间件
     */
    setupDevMiddleware() {
        let { compiler } = this;
        // 会监控文件的变化，每当有文件改变（ ctrl+s ）的时候都会重新编译打包
        // 在编译输出的过程中，会生成两个补丁文件 hash.hot-update.json 和 chunkName.hash.hot-update.js
        compiler.watch({}, () => {
            console.log("Compiled successfully!");
        });

        // 设置文件系统为内存文件系统，同时挂载到this上，以方便webserver中使用
        let fs = new MemoryFileSystem();
        this.fs = compiler.outputFileSystem = fs;
    
        // express中间件，将编译的文件返回（这里不直接使用express的static中间件，因为我们要读取的文件在内存中，所以自己实现一款简易版的static中间件）
        const staticMiddleWare = (fileDir) => {
            return (req, res, next) => {
                let { url } = req;
                if (url === "/favicon.ico") {
                    return res.sendStatus(404);
                }
                url === "/" ? url = "/index.html" : null;
                let filePath = path.join(fileDir, url);
                try {
                    let statObj = this.fs.statSync(filePath);
                    // 判断是否是文件
                    if (statObj.isFile()) {
                        // 路径和原来写到磁盘的一样，只是这是写到内存中了
                        let content = this.fs.readFileSync(filePath);
                        res.setHeader("Content-Type", mime.getType(filePath));
                        res.send(content);
                    } else {
                        // 不是文件直接返回404（简单粗暴）
                        res.sendStatus(404);
                    }
                } catch (error) {
                    res.sendStatus(404);
                }
            }
        }
        this.middleware = staticMiddleWare;// 将中间件挂载在this实例上，以便app使用
    }
    /**
     * app中使用webpack-dev-middlerware返回的中间件
     */
    routes() {
        let { compiler } = this;
        // 经过webpack(config)，会将 webpack.config.js 导出的对象 挂在compiler.options上
        let config = compiler.options;
        // 使用webpack-dev-middleware导出的中间件
        this.app.use(this.middleware(config.output.path));
    }
    /**
     * 创建webserver服务器
     */
    createServer() {
        this.server = http.createServer(this.app);
    }
    /**
     * 创建websocket服务器
     */
    createSocketServer() {
        // socket.io+http服务 实现一个websocket
        const io = socket(this.server);
        // 监听新的客户端连接，并缓存起来
        io.on("connection", (socket) => {
            console.log("A new client connect server");
            // 把所有的websocket客户端存起来，以便编译完成后向这个websocket客户端发送消息（实现双向通信的关键）
            this.clientSocketList.push(socket);
            // 每当有客户端断开时，移除这个websocket客户端
            socket.on("disconnect", () => {
                this.clientSocketList = this.clientSocketList.splice(this.clientSocketList.indexOf(socket), 1);
            });
            // 向客户端发送最新的一个编译hash
            socket.emit('hash', this.currentHash);
            // 再向客户端发送一个ok
            socket.emit('ok');
        });
    }
    /**
     * 启动webserver服务，开始监听
     */
    listen(port, host = "localhost", cb = new Function()) {
        this.server.listen(port, host, cb);
    }
}

module.exports = Server;