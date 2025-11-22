// Archivo: js/script_admin.js
const API_URL = '/api/admin'; // Base url

document.addEventListener('DOMContentLoaded', () => {
    cargarTodo();

    // Listeners para Formularios de Crear
    configurarForm('formTarjetas', 'tarjetas');
    configurarForm('formAcordeon', 'acordeon');
    configurarForm('formUsuarios', 'users');

    // Listener para Botón Guardar Edición
    document.getElementById('btnGuardarCambios').addEventListener('click', guardarEdicion);
});

// --- FUNCIONES DE CARGA ---
async function cargarTodo() {
    cargarTabla('tarjetas', renderFilaTarjeta);
    cargarTabla('acordeon', renderFilaAcordeon);
    cargarTabla('users', renderFilaUsuario);
}

async function cargarTabla(endpoint, renderFunction) {
    try {
        const res = await fetch(`${API_URL}/${endpoint}`);
        const data = await res.json();
        const tbody = document.querySelector(`#tabla${capitalize(endpoint === 'users' ? 'Usuarios' : endpoint)}`);
        tbody.innerHTML = '';
        data.forEach(item => {
            tbody.innerHTML += renderFunction(item);
        });
    } catch (error) {
        console.error("Error cargando " + endpoint, error);
    }
}

// --- RENDERIZADO (HTML DE LAS TABLAS) ---
function renderFilaTarjeta(i) {
    return `<tr>
        <td>${i.orden}</td>
        <td><span class="material-symbols-outlined">${i.icono}</span></td>
        <td>${i.titulo}</td>
        <td>${i.descripcion}</td>
        <td>${btnAcciones(i.id, 'tarjetas', JSON.stringify(i).replace(/"/g, '&quot;'))}</td>
    </tr>`;
}

function renderFilaAcordeon(i) {
    return `<tr>
        <td>${i.orden}</td>
        <td>${i.titulo}</td>
        <td>${i.contenido.substring(0,30)}...</td>
        <td>${btnAcciones(i.id, 'acordeon', JSON.stringify(i).replace(/"/g, '&quot;'))}</td>
    </tr>`;
}

function renderFilaUsuario(i) {
    return `<tr>
        <td>${new Date(i.fecha_registro).toLocaleDateString()}</td>
        <td>${i.nombre_usuario}</td>
        <td>${i.correo_electronico}</td>
        <td>${btnAcciones(i.id_usuarios, 'users', JSON.stringify(i).replace(/"/g, '&quot;'))}</td>
    </tr>`;
}

function btnAcciones(id, type, dataObj) {
    // Aquí pasamos el objeto entero en data-obj para facilitar el rellenado del modal
    return `
        <button class="btn btn-sm btn-warning" onclick='abrirModal("${type}", ${dataObj})'>Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminar('${type}', '${id}')">Borrar</button>
    `;
}

// --- LÓGICA DE EDICIÓN ---
function abrirModal(type, item) {
    // Rellenar campos ocultos
    document.getElementById('editType').value = type;
    // Detectar ID correctamente
    const id = item.id || item.id_usuarios; 
    document.getElementById('editId').value = id;

    // Referencias a inputs del modal
    const f1 = document.getElementById('editField1'); // Título / Nombre
    const f2 = document.getElementById('editField2'); // Desc / Email
    const f3 = document.getElementById('editField3'); // Orden
    const f4 = document.getElementById('editField4'); // Icono

    // Limpiar / Mostrar según tipo
    if (type === 'tarjetas') {
        f1.value = item.titulo;
        f2.value = item.descripcion;
        f3.parentElement.style.display = 'block'; f3.value = item.orden;
        f4.parentElement.style.display = 'block'; f4.value = item.icono;
    } else if (type === 'acordeon') {
        f1.value = item.titulo;
        f2.value = item.contenido;
        f3.parentElement.style.display = 'block'; f3.value = item.orden;
        f4.parentElement.style.display = 'none';
    } else if (type === 'users') {
        f1.value = item.nombre_usuario;
        f2.value = item.correo_electronico;
        f3.parentElement.style.display = 'none';
        f4.parentElement.style.display = 'none';
    }

    new bootstrap.Modal(document.getElementById('modalEdicion')).show();
}

async function guardarEdicion() {
    const type = document.getElementById('editType').value;
    const id = document.getElementById('editId').value;
    
    let body = {};
    if (type === 'tarjetas') {
        body = {
            titulo: document.getElementById('editField1').value,
            descripcion: document.getElementById('editField2').value,
            orden: document.getElementById('editField3').value,
            icono: document.getElementById('editField4').value
        };
    } else if (type === 'acordeon') {
        body = {
            titulo: document.getElementById('editField1').value,
            contenido: document.getElementById('editField2').value,
            orden: document.getElementById('editField3').value
        };
    } else if (type === 'users') {
        body = {
            nombre_usuario: document.getElementById('editField1').value,
            correo_electronico: document.getElementById('editField2').value
        };
    }

    await peticion(`${API_URL}/${type}/${id}`, 'PUT', body);
    // Cerrar modal y recargar
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdicion'));
    modal.hide();
    cargarTodo();
}

// --- ELIMINAR Y CREAR ---

async function eliminar(type, id) {
    if(!confirm('¿Seguro?')) return;
    await peticion(`${API_URL}/${type}/${id}`, 'DELETE');
    cargarTodo();
}

function configurarForm(formId, type) {
    document.getElementById(formId).addEventListener('submit', async (e) => {
        e.preventDefault();
        let body = {};
        
        if(type === 'tarjetas') {
            body = {
                orden: document.getElementById('tOrden').value,
                icono: document.getElementById('tIcono').value,
                titulo: document.getElementById('tTitulo').value,
                descripcion: document.getElementById('tDesc').value
            };
        } else if(type === 'acordeon') {
            body = {
                orden: document.getElementById('aOrden').value,
                titulo: document.getElementById('aTitulo').value,
                contenido: document.getElementById('aContenido').value
            };
        } else if(type === 'users') {
            body = {
                nombre_usuario: document.getElementById('uUser').value,
                correo_electronico: document.getElementById('uEmail').value,
                contrasena: document.getElementById('uPass').value
            };
        }

        await peticion(`${API_URL}/${type}`, 'POST', body);
        e.target.reset();
        cargarTodo();
    });
}

// --- HELPER FETCH ---
async function peticion(url, method, data) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);
    
    const res = await fetch(url, options);
    if (!res.ok) alert('Error en la operación');
    return res.json();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }