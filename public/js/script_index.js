// ===== GESTIÓN DE FORMULARIOS Y ANIMACIONES =====
document.addEventListener('DOMContentLoaded', function () {
  inicializarAnimaciones();
  inicializarFormularios();
  inicializarAuthManager();
});

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
    });
  }

  switchFormLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const target = this.getAttribute('data-target');
      mostrarFormulario(target);
    });
  });

  if (formOverlay) {
    formOverlay.addEventListener('click', function (e) {
      if (e.target === formOverlay) {
        formOverlay.classList.remove('active');
      }
    });
  }
}

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

// ===== GESTIÓN DE AUTENTICACIÓN =====
function inicializarAuthManager() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    showMessage('Por favor, completa todos los campos', 'error');
    return;
  }

  try {
    showMessage('Iniciando sesión...', 'info');

    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const resp = await response.json();

    if (!response.ok || !resp.success) {
      showMessage(resp.error || 'Credenciales inválidas', 'error');
      return;
    }

    if (resp.user) {
      localStorage.setItem('user_id', resp.user.id);
      localStorage.setItem('user_email', resp.user.email || email);
      localStorage.setItem('user_name', resp.user.username || 'Usuario');
    }

    if (resp.access_token) {
      localStorage.setItem('supabase_token', resp.access_token);
    } else if (resp.session && resp.session.access_token) {
      localStorage.setItem('supabase_token', resp.session.access_token);
    } else {
      showMessage('No se recibió token de sesión. Intenta de nuevo.', 'error');
      return;
    }

    showMessage('Login exitoso! Redirigiendo...', 'success');

    setTimeout(() => {
      const overlay = document.querySelector('.form-overlay');
      overlay?.classList.remove('active');
      window.location.href = '/menu';
    }, 800);
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Error de conexión con el servidor', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('register-username')?.value?.trim();
  const email = document.getElementById('register-email')?.value?.trim();
  const password = document.getElementById('register-password')?.value;
  const confirmPassword = document.getElementById('register-confirm')?.value;

  if (!username || !email || !password || !confirmPassword) {
    showMessage('Por favor, completa todos los campos', 'error');
    return;
  }
  if (password !== confirmPassword) {
    showMessage('Las contraseñas no coinciden', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  try {
    showMessage('Creando cuenta...', 'info');

    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      showMessage(result.error || 'No se pudo crear la cuenta', 'error');
      return;
    }

    showMessage(result.message || 'Cuenta creada. Ahora inicia sesión.', 'success');

    setTimeout(() => {
      mostrarFormulario('login');
      document.getElementById('register-form')?.reset();
    }, 1000);
  } catch (error) {
    console.error('Register error:', error);
    showMessage('Error de conexión con el servidor', 'error');
  }
}

// ===== SISTEMA DE MENSAJES =====
function showMessage(message, type) {
  const existingMessage = document.querySelector('.alert-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `alert-message alert alert-${getAlertType(type)} position-fixed`;
  messageDiv.style.cssText = `
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    animation: slideInRight 0.3s ease;
  `;
  messageDiv.textContent = message;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => messageDiv.remove(), 300);
    }
  }, 5000);
}

function getAlertType(type) {
  const types = {
    success: 'success',
    error: 'danger',
    info: 'info',
    warning: 'warning'
  };
  return types[type] || 'info';
}

// ===== ANIMACIONES CSS PARA MENSAJES =====
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ===== BOTÓN DE GOOGLE (PARA EL FUTURO) =====
function handleGoogleAuth() {
  showMessage('Función en desarrollo...', 'info');
}