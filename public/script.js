document.addEventListener('DOMContentLoaded', function () {
    alert('Click anywhere on the page to enable ping sounds');
});

let oldData = [];

// Function to fetch comments and update the list
function fetchComments() {
    // Fetch the data from the /comments endpoint
    fetch('/comments')
        .then(response => response.json())
        .then(data => {
            // Reverse the data array
            data.reverse();

            // Check if the newest data matches the old data
            if (oldData.length > 0 && (oldData[0].username !== data[0].username || oldData[0].content !== data[0].content)) {
                new Audio('ping.mp3').play();
            }

            // Update oldData with the newest data
            oldData = data.slice(0, 1);

            // Create a new unordered list
            const newUl = document.createElement('ul');

            // Loop through each item in the data
            data.forEach(item => {
                // Create a new list item
                const li = document.createElement('li');

                // Create a div to hold the comment
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.alignItems = 'top';
                div.style.marginBottom = '10px';

                // Create a div for the icon with a background of dark gray
                const iconDiv = document.createElement('div');
                iconDiv.style.width = '32px';
                iconDiv.style.height = '32px';
                iconDiv.style.marginRight = '10px';
                iconDiv.style.marginTop = '5px';
                iconDiv.style.backgroundColor = 'black';
                iconDiv.style.borderRadius = '50%'; // This will crop the div to a circle

                // Create an img for the icon
                const img = document.createElement('img');
                img.src = 'https://gdbrowser.com/assets/difficulties/normal.png'; // wouldve used icon.png but this is funnier
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%'; // This will crop the image to a circle

                // Append the img to the iconDiv
                iconDiv.appendChild(img);

                // Create a div to hold the username and content
                const textDiv = document.createElement('div');

                // Create a span for the username
                const span = document.createElement('span');
                span.textContent = `${item.username}`;
                span.style.display = 'inline-block';
                span.style.marginRight = '10px'; // Add some space between the username and the time

                // Create a span for the time on the same line as username (${item.age} ago)
                const timeSpan = document.createElement('span');
                timeSpan.textContent = `${item.age} ago`;
                timeSpan.style.display = 'inline-block';
                timeSpan.style.fontSize = '0.8em';
                timeSpan.style.color = 'gray';
                timeSpan.style.marginRight = '-7px';
                // Create a p for the content
                const p = document.createElement('p');
                p.textContent = item.content;

                // Append the span and p to the textDiv
                textDiv.appendChild(span);
                textDiv.appendChild(timeSpan);
                textDiv.appendChild(p);

                // Append the iconDiv and textDiv to the div
                div.appendChild(iconDiv);
                div.appendChild(textDiv);

                // Append the div to the list item
                li.appendChild(div);

                // Append the list item to the unordered list
                newUl.appendChild(li);
            });

            // Replace the old list with the new one
            const oldUl = document.querySelector('ul');
            if (oldUl) {
                oldUl.replaceWith(newUl);
            } else {
                // Append the unordered list to the body of the document
                document.body.appendChild(newUl);
            }

            // Scroll to the bottom of the page
            window.scrollTo(0, document.body.scrollHeight);
        })
        .catch(error => console.error('Error:', error));
}

// Fetch comments and update the list every 2 seconds
fetchComments();
setInterval(fetchComments, 2000);