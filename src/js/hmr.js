const hotTag = document.getElementById('hotHmrContent');

let content = "测试热更新...";

let style = {
    color: 'red',
    fontSize: '32px'
};

console.log("welcome webpack-der-server");

const render = () => {
    hotTag.innerText = content + Math.ceil(Math.random() * 1000);
    hotTag.style.color = style.color || '';
    hotTag.style.fontSize = style.fontSize || '';
}

render();