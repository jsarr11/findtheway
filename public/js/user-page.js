
$(document).ready(function() {
    // Fetch username and display it
    fetch('/get-username')
        .then(response => response.json())
        .then(data => {
            const username = data.username;
            sessionStorage.setItem('username', username); // Store the username in sessionStorage
            $('#username').text(data.username);
            $('#usernameEn').text(data.username);
            console.log('Username stored in sessionStorage:', sessionStorage.getItem('username')); // Log the username
        })
        .catch(err => console.error('Error fetching username', err));
});