// websocket 客户端
const io = require("socket.io-client/dist/socket.io");
// 和 hot-dev-server.js 共用一个 EventEmitter 实例，这里用于广播事件
const Emitter = require("./emiitter");

// 最新的编译hash
let currentHash = 0;
// 上一次编译生成的 hash ，如果本次编译和上次hash一致，则不更新
let prveHash = 0;

//【1】连接 websocket 服务器
const URL = "/";
const socket = io(URL);

//【2】websocket 客户端监听事件
//【2.1】注册 hash 事件回调，这个回调主要干了一件事，获取最新的编译hash值
socket.on("hash", (hash) => {
    console.log("hash", hash);
    prveHash = currentHash;
    currentHash = hash;
});
//【2.2】注册ok事件回调，调用 reloadApp 进行热更新
socket.on("ok", () => {
    console.log("ok");
    if(currentHash !== prveHash){
        reloadApp();
    }
});
//【2.3】客户端连接成功
socket.on("connect", () => {
    console.log("Client connect successfully.");
});

//【3】reloadApp 中广播 webpackHotUpdate 事件
const reloadApp = () => {
    let hot = true;
  	// 会进行判断，是否支持热更新；这里本身就是为了实现热更新，所以简单粗暴设置为true
    if (hot) {
        // 事件通知：如果支持的话发射 webpackHotUpdate 事件
        Emitter.emit("webpackHotUpdate", currentHash);
    } else {
        // 直接刷新：如果不支持则直接刷新浏览器	   	
        window.location.reload();
    }
};