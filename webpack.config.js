const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { HotModuleReplacementPlugin } = require("webpack");

// https://juejin.cn/post/6844904020528594957

module.exports = {
    mode: "development",
    // 这里还没有将客户端代码配置，而是通过updateCompiler方法更改entry属性
    entry: "./src/main.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "[name].js"
    },
    plugins: [
        // 输出一个html，并将打包的chunk引入
        // new HtmlWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: path.join(__dirname, './dist/index.html'),
            template: path.join(__dirname, './src/index.html')
        }),
        // 注入HMR runtime代码
        new HotModuleReplacementPlugin()
    ]
};
