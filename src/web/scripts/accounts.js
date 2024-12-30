// Manage Sign in
document.getElementById('signInForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent form from submitting normally

    // Get username and password from the form
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // async function to handle sign-in logic
    async function handleSignIn() {
        try {
            // Send the login data via POST using fetch
            const response = await fetch(`${url}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }) // Send data as JSON
            });

            const data = await response.json();

            if (data.success) {
                // Update sign-in button
                document.getElementById('signInButton').innerHTML = `
                    <span id="signInText" class="py-2.5 px-10 flex items-center justify-center">Hi, ${username}</span>
                    <div id="dropdownMenu" class="hidden absolute right-0 w-full bg-white border border-gray-300 shadow-lg">
                        <div class="w-full h-full text-black text-center">
                            <a class="py-2.5 px-10 w-full hover:bg-gray-100 block" href="/profile">Profile</a>
                        </div>
                        <div class="py-2.5 px-10 hover:bg-gray-100 text-black text-center cursor-pointer w-full" onclick="logout()">Log Out</div>
                    </div>`;

                isSignedIn = true;

                // Hide the sign in popup
                togglePopup();

                currentUserId = data.userId;

                await loadLineup(currentUserId, currentMatchweek);
            } else {
                document.getElementById('message').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('message').classList.remove('hidden');
        }
    }

    handleSignIn();
});


// Manage log out
function logout() {
    localStorage.removeItem('username'); // Clear the stored username
    isSignedIn = false;  // Update sign-in state

    // Revert the sign-in button
    document.getElementById('signInButton').innerHTML = `
        <span id="signInText">Sign In/Create Account</span>
        <div id="dropdownMenu" class="hidden absolute right-0 w-full bg-white border border-gray-300 shadow-lg">
            <div class="text-black text-center"><a class="py-2.5 px-10 hover:bg-gray-100" href="/profile">Profile</a></div>
            <div class="py-2.5 px-10 hover:bg-gray-100 text-black text-center cursor-pointer" onclick="logout()">Log Out</div>
        </div>`;

    // redirect to login page
    window.location.href = '../web/index.html';
    
    console.log("Logged Out");
}


// Manage Register
document.getElementById('createAccountForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent form from submitting normally

    // Get username and password from the form
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('passwordMessage').classList.remove('hidden');
        return;
    }

    document.getElementById('passwordMessage').classList.add('hidden');

    // async function to handle sign-in logic
    async function handleRegister() {
        try {
            // Send the login data via POST using fetch
            const response = await fetch(`${url}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Update sign-in button with user details
                document.getElementById('signInButton').innerHTML = `
                    <span id="signInText" class="py-2.5 px-10 flex items-center justify-center">Hi, ${username}</span>
                    <div id="dropdownMenu" class="hidden absolute right-0 w-full bg-white border border-gray-300 shadow-lg">
                        <div class="w-full h-full text-black text-center">
                            <a class="py-2.5 px-10 w-full hover:bg-gray-100 block" href="/profile">Profile</a>
                        </div>
                        <div class="py-2.5 px-10 hover:bg-gray-100 text-black text-center cursor-pointer w-full" onclick="logout()">Log Out</div>
                    </div>`;

                isSignedIn = true;

                // Hide sign in and create account popup
                togglePopup();
                toggleCreateAccountPopup();

                currentUserId = data.userId;

                await loadLineup(currentUserId, currentMatchweek);
            } else {
                if (data.message === 'Username already exists') {
                    document.getElementById('accountMessage').classList.remove('hidden');
                } else {
                    document.getElementById('accountMessage').classList.remove('hidden');
                    document.getElementById('accountMessage').textContent = 'Error occurred during registration.';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('message').classList.remove('hidden');
        }
    }

    handleRegister();
});
