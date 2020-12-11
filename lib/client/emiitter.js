const { EventEmitter } = require("events");

// 使用 events 发布订阅模式，主要是逻辑解耦
module.exports = new EventEmitter();