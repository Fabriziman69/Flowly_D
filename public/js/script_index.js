document.addEventListener('DOMContentLoaded', function () {
    inicializarAnimaciones();
    inicializarFormularios();
    inicializarAuthManager();
});

// Gestiona la apertura y cierre de modales
function inicializarAnimaciones() {
    const showFormBtn = document.querySelector('.show-form-btn');
    const formOverlay = document.querySelector('.form-overlay');
    const closeBtn = document.querySelector('.close-btn');
    const switchFormLinks = document.querySelectorAll('.switch-form-link');

    // Abrir modal de inicio
    if (showFormBtn && formOverlay) {
        showFormBtn.addEventListener('click', function () {
            formOverlay.classList.add('active');
            mostrarFormulario('login');
        });
    }

    // Cerrar modal
    if (closeBtn && formOverlay) {
        closeBtn.addEventListener('click', function () {
            formOverlay.classList.remove('active');
        });
    }

    // Cambiar entre Login y Registro
    switchFormLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            mostrarFormulario(target);
        });
    });

    // Cerrar al hacer clic fuera del contenido
    if (formOverlay) {
        formOverlay.addEventListener('click', function (e) {
            if (e.target === formOverlay) {
                formOverlay.classList.remove('active');
            }
        });
    }
    
    // Activador del panel de administración
    const adminTrigger = document.getElementById('secret-admin-trigger');
    if(adminTrigger) {
        adminTrigger.addEventListener('click', () => {
            document.querySelector('.admin-overlay').classList.add('active');
        });
    }
    
    // Cerrar modal de administración
    const closeAdmin = document.querySelector('.admin-close-btn');
    if(closeAdmin) {
        closeAdmin.addEventListener('click', () => {
            document.querySelector('.admin-overlay').classList.remove('active');
        });
    }
    
    // Autenticación de administrador
    const adminForm = document.getElementById('admin-login-form');
    if(adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('admin-username').value;
            const p = document.getElementById('admin-password').value;
            
            // Credenciales de acceso
            if(u === "adminflowly" && p === "secreto123") {
                localStorage.setItem('flowly_is_admin', 'true');
                window.location.href = '/admin-panel.html';
            } else {
                alert("Credenciales incorrectas");
            }
        });
    }
}

// Alterna la visibilidad de los formularios
function mostrarFormulario(tipo) {
    const loginPage = document.getElementById('login-page');
    const registerPage = document.getElementById('register-page');

    if (!loginPage || !registerPage) return;

    if (tipo === 'login') {
        loginPage.classList.add('active');
        registerPage.classList.remove('active');
    } else {
        loginPage.classList.remove('active');
        registerPage.classList.add('active');
    }
}

// Configura la visualización de contraseñas
function inicializarFormularios() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('i');

            if (!passwordInput || !icon) return;

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Configura los eventos de envío (submit)
function inicializarAuthManager() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
}

// Proceso de inicio de sesión
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) return alert('Por favor, completa todos los campos');

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const resp = await response.json();

        if (!response.ok || !resp.success) {
            return alert(resp.error || 'Credenciales inválidas');
        }

        // Almacenamiento de sesión
        if (resp.user) {
            localStorage.setItem('user_id', resp.user.id);
            localStorage.setItem('user_email', resp.user.email || email);
            localStorage.setItem('user_name', resp.user.username || 'Usuario');
        }

        if (resp.access_token) localStorage.setItem('supabase_token', resp.access_token);
        else if (resp.session && resp.session.access_token) localStorage.setItem('supabase_token', resp.session.access_token);
        
        // Redirección
        window.location.href = '/menu';

    } catch (error) {
        alert('Error de conexión con el servidor');
    }
}

// Proceso de registro de usuario
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm')?.value;

    if (!username || !email || !password || !confirmPassword) return alert('Completa todos los campos');
    if (password !== confirmPassword) return alert('Las contraseñas no coinciden');
    if (password.length < 6) return alert('La contraseña debe tener al menos 6 caracteres');

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username })
        });

        const result = await response.json();
        if (!response.ok || !result.success) return alert(result.error || 'Error al crear cuenta');

        alert('Cuenta creada exitosamente. Por favor inicia sesión.');
        
        mostrarFormulario('login');
        document.getElementById('register-form')?.reset();

    } catch (error) {
        alert('Error de conexión');
    }
}