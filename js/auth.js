// js/auth.js
let currentAuthMode = 'login';

// Initialize auth state check
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
});

async function checkAuthState() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const authBtn = document.getElementById('authBtn');
    
    if (user) {
        authBtn.textContent = 'Logout';
        authBtn.onclick = handleLogout;
        updateNavForLoggedIn();
    } else {
        authBtn.textContent = 'Login';
        authBtn.onclick = () => showAuthModal('login');
    }
}

function showAuthModal(mode) {
    currentAuthMode = mode;
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const nameField = document.getElementById('nameField');
    const switchText = document.getElementById('authSwitchText');
    
    if (mode === 'register') {
        title.textContent = 'Create Account';
        submitBtn.textContent = 'Register';
        nameField.style.display = 'block';
        switchText.innerHTML = 'Already have an account? <a href="#" onclick="switchAuthMode(\'login\')">Login</a>';
    } else {
        title.textContent = 'Login';
        submitBtn.textContent = 'Login';
        nameField.style.display = 'none';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="switchAuthMode(\'register\')">Register</a>';
    }
    
    modal.style.display = 'flex';
    document.getElementById('authForm').reset();
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function switchAuthMode(mode) {
    showAuthModal(mode);
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('authSubmitBtn');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    try {
        if (currentAuthMode === 'register') {
            const fullName = document.getElementById('fullName').value;
            await handleRegister(email, password, fullName);
        } else {
            await handleLogin(email, password);
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthMode === 'register' ? 'Register' : 'Login';
    }
}

async function handleRegister(email, password, fullName) {
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'user'
            }
        }
    });
    
    if (error) throw error;
    
    // Save user details to custom users table
    if (data.user) {
        const { error: userError } = await supabaseClient
            .from('users')
            .insert([
                { id: data.user.id, email, full_name: fullName, role: 'user' }
            ]);
        
        if (userError) console.error('Error saving user:', userError);
    }
    
    showToast('Registration successful! Please verify your email.', 'success');
    closeAuthModal();
    checkAuthState();
}

async function handleLogin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    showToast('Login successful!', 'success');
    closeAuthModal();
    checkAuthState();
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        showToast('Error logging out', 'error');
        return;
    }
    showToast('Logged out successfully', 'info');
    checkAuthState();
    window.location.href = 'index.html';
}

function updateNavForLoggedIn() {
    // Update UI for logged in user
    const navLinks = document.getElementById('navLinks');
    // Add any dashboard specific links if needed
}

// Toast notification system
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    if (event.target === modal) {
        closeAuthModal();
    }
};
