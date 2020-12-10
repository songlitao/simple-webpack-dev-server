let style = {
    color: 'red',
    fontSize: '32px'
};

const msg = document.getElementById('msg');

msg.style.color = style.color || '';
msg.style.fontSize = style.fontSize || '';