/*
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        alert('Click anywhere on the page to enable ping sounds');
    }, 1000);
});
*/

let oldData = [];
let signedIn = false;
let loopEnabled = true;

function checkSignIn() {
    fetch('/checksignin')
        .then(response => response.json())
        .then(data => {
            const signInButton = document.querySelector('#signin');
            if (data.success) {
                signedIn = true;
                signInButton.textContent = `Sign Out (${data.username})`;
                signInButton.onclick = signOut;
                signInButton.classList.remove('hidden');
            } else {
                signedIn = false;
                signInButton.textContent = 'Sign In';
                signInButton.onclick = signIn;
                signInButton.classList.remove('hidden');
            }
        })
        .catch(error => console.error('Error:', error));
}

checkSignIn();

function signIn() {
    const username = prompt('GD Username');
    const password = prompt('GD Password');
    fetch(`/signin?u=${username}&p=${password}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Successfully signed in');
                checkSignIn();
            } else {
                alert('Failed to sign in (is your username and password correct?)');
            }
        })
        .catch(error => console.error('Error:', error));
}

function signOut() {
    fetch('/signout', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Successfully signed out');
                checkSignIn();
            } else {
                alert('Failed to sign out');
            }
        })
        .catch(error => console.error('Error:', error));
}

function fetchComments() {
    fetch('/comments')
        .then(response => response.json())
        .then(data => {
            if (document.querySelector('#message') && document.querySelector('#message').disabled) {
                document.querySelector('#message').disabled = false;
                document.querySelector('#message').value = '';
            }
            data.reverse();

            if (oldData.length > 0 && (oldData[0].username !== data[0].username || oldData[0].content !== data[0].content)) {
                new Audio('ping.mp3').play();
            }

            oldData = data.slice(0, 1);

            const msgBar = document.createElement('input');
            // <input type="text" id="message" placeholder="Message #daily">
            msgBar.type = 'text';
            msgBar.id = 'message';
            msgBar.autocomplete = 'off';
            msgBar.placeholder = 'Message #daily';

            const newUl = document.createElement('ul');

            data.forEach(item => {
                const li = document.createElement('li');

                const div = document.createElement('div');
                div.classList.add('div');

                const iconDiv = document.createElement('div');
                iconDiv.classList.add('iconDiv');

                const img = document.createElement('img');
                img.src = `/icon?i=${encodeURIComponent(`${item.iconType}_${item.iconID}`)}`;

                iconDiv.appendChild(img);

                const textDiv = document.createElement('div');

                const a = document.createElement('a');
                a.textContent = `${item.username}`;
                a.href = `https://gdbrowser.com/u/${item.username}`;
                a.target = '_blank';

                const timeSpan = document.createElement('span');
                // timeSpan.classList.add('timeSpan');
                timeSpan.textContent = `${item.age} ago`;
                const p = document.createElement('p');
                p.textContent = item.content;

                textDiv.appendChild(a);
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
                document.body.appendChild(msgBar);
            }

            window.scrollTo(0, document.body.scrollHeight);
        })
        .catch(error => console.error('Error:', error));
}

function postComment() {
    const message = document.querySelector('#message').value;
    fetch(`/post?c=${message}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // document.querySelector('#message').value = '';
                // document.querySelector('#message').disabled = false;
                // loopEnabled = false;
                // fetchComments();
            } else {
                document.querySelector('#message').disabled = false;
                alert('Failed to post comment');
            }
        })
        .catch(error => console.error('Error:', error));
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && signedIn) {
        document.querySelector('#message').disabled = true;
        postComment();
    }
});

fetchComments();
setInterval(function(){
    if (loopEnabled) {
        fetchComments();
    } else {
        loopEnabled = true;
    }
}, 2.25e3);