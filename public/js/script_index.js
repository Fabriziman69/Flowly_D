document.addEventListener('DOMContentLoaded', function () {
    inicializarAnimaciones();
    inicializarFormularios();
    inicializarAuthManager();
    verificarModoRecuperacion(); // <--- NUEVO: Detecta si venimos de un link de reset
});

// --- LÓGICA DE INTERFAZ ---
function inicializarAnimaciones() {
    const showFormBtn = document.querySelector('.show-form-btn');
    const formOverlay = document.querySelector('.form-overlay');
    const closeBtn = document.querySelector('.close-btn');
    const switchFormLinks = document.querySelectorAll('.switch-form-link');

    if (showFormBtn && formOverlay) {
        showFormBtn.addEventListener('click', function () {
            formOverlay.classList.add('active');
            mostrarFormulario('login');
        });
    }

    if (closeBtn && formOverlay) {
        closeBtn.addEventListener('click', function () {
            formOverlay.classList.remove('active');
            // Limpiar URL si hay hash de recuperación para evitar bucles
            if(window.location.hash) history.replaceState(null, null, ' ');
        });
    }

    // Manejo de cambio de formularios (Login <-> Registro <-> Olvidé pass)
    switchFormLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            mostrarFormulario(target);
        });
    });

    // Click fuera del modal
    if (formOverlay) {
        formOverlay.addEventListener('click', function (e) {
            if (e.target === formOverlay) {
                formOverlay.classList.remove('active');
                if(window.location.hash) history.replaceState(null, null, ' ');
            }
        });
    }

    // Lógica Admin
    const adminTrigger = document.getElementById('secret-admin-trigger');
    if(adminTrigger) {
        adminTrigger.addEventListener('click', () => {
            document.querySelector('.admin-overlay').classList.add('active');
        });
    }
    const closeAdmin = document.querySelector('.admin-close-btn');
    if(closeAdmin) {
        closeAdmin.addEventListener('click', () => {
            document.querySelector('.admin-overlay').classList.remove('active');
        });
    }
    const adminForm = document.getElementById('admin-login-form');
    if(adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('admin-username').value;
            const p = document.getElementById('admin-password').value;
            if(u === "adminflowly" && p === "secreto123") {
                localStorage.setItem('flowly_is_admin', 'true');
                window.location.href = '/admin-panel.html';
            } else {
                alert("Credenciales incorrectas");
            }
        });
    }
}

function mostrarFormulario(tipo) {
    // Ocultar todos
    document.querySelectorAll('.form-page').forEach(page => page.classList.remove('active'));
    
    // Mostrar el deseado
    const targetPage = document.getElementById(tipo + '-page');
    if (targetPage) targetPage.classList.add('active');
}

// --- LÓGICA DE FORMULARIOS ---
function inicializarFormularios() {
    // Botones de ojo (ver contraseña)
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // Links de "¿Olvidaste tu contraseña?"
    const forgotLink = document.querySelector('.forgot-password');
    if(forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarFormulario('forgot');
        });
    }
}

function inicializarAuthManager() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-form');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);
    if (resetForm) resetForm.addEventListener('submit', handleResetPassword);
}

// --- VERIFICACIÓN DE LINK DE RECUPERACIÓN ---
function verificarModoRecuperacion() {
    // Supabase devuelve el token en el hash de la URL (ej: #access_token=...&type=recovery)
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
        // Abrir overlay y mostrar formulario de nueva contraseña
        const formOverlay = document.querySelector('.form-overlay');
        if(formOverlay) formOverlay.classList.add('active');
        mostrarFormulario('reset');
    }
}

// --- HANDLERS DE API ---

// 1. Login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/auth/login', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!data.success) return alert(data.error || 'Error al iniciar sesión');

        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('supabase_token', data.access_token);
        window.location.href = '/menu';

    } catch (error) { alert('Error de conexión'); }
}

// 2. Registro
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) return alert('Las contraseñas no coinciden');

    try {
        const res = await fetch('/auth/register', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password, username })
        });
        const data = await res.json();

        if (!data.success) return alert(data.error);
        
        alert('Cuenta creada. Por favor inicia sesión.');
        mostrarFormulario('login');
        e.target.reset();

    } catch (error) { alert('Error de conexión'); }
}

// 3. Solicitar recuperación (Forgot Password)
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn = e.target.querySelector('button');

    try {
        btn.disabled = true; btn.textContent = "Enviando...";
        
        const res = await fetch('/auth/forgot-password', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if(!res.ok) throw new Error(data.error);

        alert('Si el correo existe, recibirás un enlace de recuperación.');
        mostrarFormulario('login');

    } catch (error) {
        alert(error.message || 'Error al enviar solicitud');
    } finally {
        btn.disabled = false; btn.textContent = "Enviar Enlace";
    }
}

// 4. Guardar nueva contraseña (Reset Password)
async function handleResetPassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('new-password').value;
    const btn = e.target.querySelector('button');

    // Extraer tokens del Hash de la URL que mandó Supabase
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken) return alert('Enlace inválido o expirado.');

    try {
        btn.disabled = true; btn.textContent = "Actualizando...";

        const res = await fetch('/auth/update-password', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                new_password: newPass, 
                access_token: accessToken,
                refresh_token: refreshToken
            })
        });
        const data = await res.json();

        if(!res.ok) throw new Error(data.error);

        alert('Contraseña actualizada. Por favor inicia sesión con tu nueva clave.');
        
        // Limpiar URL y volver al login
        history.replaceState(null, null, ' ');
        mostrarFormulario('login');

    } catch (error) {
        alert(error.message || 'Error al actualizar');
    } finally {
        btn.disabled = false; btn.textContent = "Actualizar Contraseña";
    }
}