/**
 * 更改 webpack 的 entry 属性，增加 websocket 客户端文件，让其编译到 chunk 中
 *      在进行webpack编译前，调用了updateCompiler(compiler)方法，这个方法很关键，他会往chunk中偷偷塞入两个文件：
 *      1.lib/client/client.js
 *      2.lib/client/hot-dev-server.js
 */
const path = require("path");

let updateCompiler = (compiler) => {
    const config = compiler.options;
    
    config.entry = {
        main: [
            path.resolve(__dirname, "../client/index.js"),
            path.resolve(__dirname, "../client/hot-dev-server.js"),
            config.entry
        ]
    };
    compiler.hooks.entryOption.call(config.context, config.entry);
};

module.exports = updateCompiler;