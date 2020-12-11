/**
 * 源码中 webpack/hot/dev-server.js 
 *   if (module.hot) {
 *       var check = function check() {
 *           // 没错 module.hot.check 就是 hotCheck 函数，看是不是绕到了 HRMPlugin 在打包的 chunk 中注入的 HMR runtime 代码啦
 *           module.hot.check(true)
 *               // 日志输出
 *               .then()
 *               // 日志输出
 *               .catch()
 *       };
 *       // 和client/index.js共用一个EventEmitter实例，用于监听事件
 *       var hotEmitter = require("./emitter");
 *       // 监听 webpackHotUpdate 事件
 *       hotEmitter.on("webpackHotUpdate", function(currentHash) {
 *          check();
 *       });
 *   } else {
 *       throw new Error("[HMR] Hot Module Replacement is disabled.");
 *   }
 */

/**
 * 自定义实现 webpack/hot/dev-server.js HotModuleReplacementPlugin.runtime 热更新代码
 */
// 和 client/index.js 公用一个 EventEmitter 实例，用于监听事件
const hotEmitter = require("../emiitter");

// 最新编译生成的 hash
let currentHash = 0;
// 上一次编译生成的 hash ，源码中是 hotCurrentHash ，为了直接表达他的字面意思换个名字
let prveHotHash = 0;

//【4】监听 webpackHotUpdate 事件，然后执行 hotCheck() 方法进行检查
hotEmitter.on("webpackHotUpdate", (hash) => {
    currentHash = hash;
    if (prveHotHash) {
        console.log('开始热更新...');
        hotCheck();
    }else{
        // 说明是第一次请求
        prveHotHash = currentHash;
    }
});

//【5】调用 hotCheck 拉取两个补丁文件
const hotCheck = () => {
    // hotDownloadManifest 用来拉取 prveHotHash.hot-update.json
    hotDownloadManifest().then(hotUpdate => {
        // hotUpdate: {"h":"58ddd9a7794ab6f4e750","c":{"main":true}}
        let chunkIdList = Object.keys(hotUpdate.c);
        // 调用 hotDownloadUpdateChunk 方法通过JSONP请求获取到最新的模块代码
        chunkIdList.forEach(chunkId => {
            hotDownloadUpdateChunk(chunkId);
        });
        prveHotHash = currentHash;
    }).catch(err => {
        // 异常直接 reload
        window.location.reload();
    });
};

// 【6】拉取 prveHotHash.hot-update.json，向 server 端发送 Ajax 请求，服务端返回一个 Manifest 文件(prveHotHash.hot-update.json)，该 Manifest 包含了本次编译hash值 和 更新模块的chunk名
const hotDownloadManifest = () => {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        let hotUpdatePath = `${prveHotHash}.hot-update.json`;
        console.log(`ajax拉取Manifest文件：${hotUpdatePath}`);
        xhr.open("get", hotUpdatePath);
        xhr.onload = () => {
            // hotUpdate: {"h":"58ddd9a7794ab6f4e750","c":{"main":true}}
            let hotUpdate = JSON.parse(xhr.responseText);
            resolve(hotUpdate);
        };
        xhr.onerror = (error) => {
            reject(error);
        };
        xhr.send();
    });
};

// 【7】拉取更新的模块 chunkName.prveHotHash.hot-update.json，通过JSONP请求获取到更新的模块代码
const hotDownloadUpdateChunk = (chunkId) => {
    // 使用JSONP的原因：因为 chunkName.prveHotHash.hot-update.js 是一个js文件，我们为了让他从服务端获取后可以立马执行js脚本
    let script = document.createElement("script");
    script.charset = "utf-8";
    // chunkId.prveHotHash.hot-update.js
    let hotUpdateChunk = `${chunkId}.${prveHotHash}.hot-update.js`;
    console.log(`jsonp拉取更新的模块：${hotUpdateChunk}`);
    script.src = hotUpdateChunk;
    document.head.appendChild(script);
};

// 【8.0】这个 hotCreateModule 很重要，module.hot 的值，就是这个函数执行的结果
const hotCreateModule = (moduleId) => {
    // // module.hot属性值
    let hot = {
        accept(deps = [], callback) {
            deps.forEach(dep => {
                // 调用accept将回调函数 保存在 module.hot._acceptedDependencies 中
                hot._acceptedDependencies[dep] = callback || function () { };
            })
        },
        // module.hot.check === hotCheck
        check: hotCheck
    }
    return hot;
};

//【8】补丁JS取回来后会调用 webpackHotUpdate 方法，从而实现热更新
// 备注：拉取回来的 chunkId.prveHotHash.hot-update.js 文件执行 window.webpackHotUpdate 方法
window.webpackHotUpdate = (chunkId, moreModules) => {
    // 【9】热更新，循环新拉取的模块
    Object.keys(moreModules).forEach(moduleId => {
        // 1、通过 __webpack_require__.c 模块缓存可以找到旧模块
        let oldModule = __webpack_require__.c[moduleId];

        // 2、更新 __webpack_require__.c，利用 moduleId 将新的拉来的模块覆盖原来的模块
        let newModule = __webpack_require__.c[moduleId] = {
            i: moduleId,
            l: false,
            exports: {},
            hot: hotCreateModule(moduleId),
            parents: oldModule.parents,
            children: oldModule.children
        };

        // 3、执行最新编译生成的模块代码
        moreModules[moduleId].call(newModule.exports, newModule, newModule.exports, __webpack_require__);
        newModule.l = true;

        // 4、让父模块中存储的 _acceptedDependencies 执行
        newModule.parents && newModule.parents.forEach(parentId => {
            let parentModule = __webpack_require__.c[parentId];
            parentModule.hot._acceptedDependencies[moduleId] && parentModule.hot._acceptedDependencies[moduleId]()
        });
    });
    console.log('热更新完成...');
};
