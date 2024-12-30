
function toggleDropdown() {
    const dropdown = document.getElementById("dropdownMenu");
    dropdown.classList.toggle('hidden');
}

// Click outside to hide popup
window.addEventListener('click', function(event) {
    const popUp = document.getElementById('popup');
    if (event.target === popUp) {
        popUp.classList.add('hidden');
    }
});

// dropdown menu on hover
signInButton.addEventListener('mouseenter', function() {
    if (isSignedIn) {
        dropdownMenu.classList.remove('hidden');
    }
});

// Hide dropdown when mouse leaves
signInButton.addEventListener('mouseleave', function() {
    if (isSignedIn) {
        dropdownMenu.classList.add('hidden');
    }
});

// Sign in popup
function togglePopup() {
    const popup = document.getElementById('popup');
    popup.classList.toggle('hidden');
}


// Create account popup
function toggleCreateAccountPopup() {
    const popup = document.getElementById('createAccountPopup');
    popup.classList.toggle('hidden');
}

// Click outside to hide popup
window.addEventListener('click', function(event) {
    const popUp = document.getElementById('createAccountPopup');
    if (event.target === popUp) {
        popUp.classList.add('hidden');
        document.getElementById('popup').classList.add('hidden');
    }
});

// Save button
document.getElementById('saveTeamBtn').addEventListener('click', function() {
    if (isSignedIn) {
        saveLineup();
    } else {
        showSignInModal();
    }
});

// Have to sign in to save lineup -> show modal
function showSignInModal() {
    const modal = document.getElementById('signInModal');
    modal.classList.remove('hidden');

    document.getElementById('signInBtn').addEventListener('click', () => {
        modal.classList.add('hidden');
        togglePopup();
    });

    document.getElementById('closeModalButton').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

// Click outside to hide modal
window.addEventListener('click', function(event) {
    const modal = document.getElementById('signInModal');
    if (event.target === modal) {
        modal.classList.add('hidden');
    }
});