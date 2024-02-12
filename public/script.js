document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        alert('Click anywhere on the page to enable ping sounds');
    }, 1000);
});

let oldData = [];

function fetchComments() {
    fetch('/comments')
        .then(response => response.json())
        .then(data => {
            data.reverse();

            if (oldData.length > 0 && (oldData[0].username !== data[0].username || oldData[0].content !== data[0].content)) {
                new Audio('ping.mp3').play();
            }

            oldData = data.slice(0, 1);

            const newUl = document.createElement('ul');

            data.forEach(item => {
                const li = document.createElement('li');

                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.alignItems = 'top';
                div.style.marginBottom = '10px';

                const iconDiv = document.createElement('div');
                iconDiv.style.width = '32px';
                iconDiv.style.height = '32px';
                iconDiv.style.marginRight = '10px';
                iconDiv.style.marginTop = '5px';
                iconDiv.style.backgroundColor = 'black';
                iconDiv.style.borderRadius = '50%';

                const img = document.createElement('img');
                img.src = 'https://gdbrowser.com/assets/difficulties/normal.png'; // wouldve used icon.png but this is funnier
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';

                iconDiv.appendChild(img);

                const textDiv = document.createElement('div');

                const span = document.createElement('span');
                span.textContent = `${item.username}`;
                span.style.display = 'inline-block';
                span.style.marginRight = '10px';

                const timeSpan = document.createElement('span');
                timeSpan.textContent = `${item.age} ago`;
                timeSpan.style.display = 'inline-block';
                timeSpan.style.fontSize = '0.8em';
                timeSpan.style.color = 'gray';
                timeSpan.style.marginLeft = '-3px';
                const p = document.createElement('p');
                p.textContent = item.content;

                textDiv.appendChild(span);
                textDiv.appendChild(timeSpan);
                textDiv.appendChild(p);

                div.appendChild(iconDiv);
                div.appendChild(textDiv);

                li.appendChild(div);

                newUl.appendChild(li);
            });

            const oldUl = document.querySelector('ul');
            if (oldUl) {
                oldUl.replaceWith(newUl);
            } else {
                document.body.appendChild(newUl);
            }

            window.scrollTo(0, document.body.scrollHeight);
        })
        .catch(error => console.error('Error:', error));
}

fetchComments();
setInterval(fetchComments, 2000);