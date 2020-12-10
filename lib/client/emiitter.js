const { EventEmitter } = require("events");

// 使用 events 发布订阅模式，主要还是为了解耦
module.exports = new EventEmitter();