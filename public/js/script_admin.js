let cache = {
    tarjetas: [],
    acordeon: [],
    usuarios: []
};

document.addEventListener('DOMContentLoaded', () => {
    // Protección de admin
    if (localStorage.getItem('flowly_is_admin') !== 'true') {
        window.location.href = '/';
        return;
    }

    // Carga inicial de tablas
    actualizarTablas();

    // Botón Salir
    document.getElementById('btnSalir').addEventListener('click', () => {
        localStorage.removeItem('flowly_is_admin');
        window.location.href = '/';
    });

    // --- EVENTOS DELEGADOS (Editar/Borrar) ---
    document.addEventListener('click', (e) => {
        // Editar
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const type = btnEdit.dataset.type;
            abrirModalEditar(type, id);
        }
        // Borrar
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const type = btnDelete.dataset.type;
            eliminarItem(type, id);
        }
    });

    // --- FORMULARIOS DE CREACIÓN ---
    
    // 1. Tarjetas
    document.getElementById('formTarjetas').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            orden: document.getElementById('tOrden').value,
            icono: document.getElementById('tIcono').value,
            titulo: document.getElementById('tTitulo').value,
            descripcion: document.getElementById('tDesc').value
        };
        await apiRequest('/api/info/admin/tarjetas', 'POST', body);
        cargarData('/api/info/tarjetas', 'tarjetas', renderTarjetas, 'tablaTarjetas');
        e.target.reset();
    });

    // 2. Acordeón
    document.getElementById('formAcordeon').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            orden: document.getElementById('aOrden').value,
            titulo: document.getElementById('aTitulo').value,
            contenido: document.getElementById('aContenido').value
        };
        await apiRequest('/api/info/admin/acordeon', 'POST', body);
        cargarData('/api/info/acordeon', 'acordeon', renderAcordeon, 'tablaAcordeon');
        e.target.reset();
    });

    // 3. Usuarios
    document.getElementById('formUsuarios').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            nombre_usuario: document.getElementById('uUser').value,
            correo_electronico: document.getElementById('uEmail').value,
            contrasena: document.getElementById('uPass').value
        };
        await apiRequest('/api/admin/users', 'POST', body);
        cargarData('/api/admin/users', 'usuarios', renderUsuarios, 'tablaUsuarios');
        e.target.reset();
    });

    // --- GUARDAR EDICIÓN (UPDATE) ---
    document.getElementById('btnGuardarCambios').addEventListener('click', async () => {
        const id = document.getElementById('editId').value;
        const type = document.getElementById('editType').value;
        let url = '', body = {};

        const val1 = document.getElementById('editField1').value; // Título/Nombre
        const val2 = document.getElementById('editField2').value; // Desc/Email/Contenido
        const val3 = document.getElementById('editField3').value; // Orden
        const val4 = document.getElementById('editField4').value; // Icono

        if (type === 'usuarios') {
            url = `/api/admin/users/${id}`;
            body = { nombre_usuario: val1, correo_electronico: val2 };
        } else if (type === 'tarjetas') {
            url = `/api/info/admin/tarjetas/${id}`;
            body = { titulo: val1, descripcion: val2, orden: val3, icono: val4 };
        } else { // acordeon
            url = `/api/info/admin/acordeon/${id}`;
            body = { titulo: val1, contenido: val2, orden: val3 };
        }

        await apiRequest(url, 'PUT', body);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdicion'));
        modal.hide();
        actualizarTablas();
    });
});

// --- FUNCIONES DE CARGA ---

function actualizarTablas() {
    cargarData('/api/info/tarjetas', 'tarjetas', renderTarjetas, 'tablaTarjetas');
    cargarData('/api/info/acordeon', 'acordeon', renderAcordeon, 'tablaAcordeon');
    cargarData('/api/admin/users', 'usuarios', renderUsuarios, 'tablaUsuarios');
}

async function cargarData(url, type, renderFn, tableId) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        cache[type] = data;
        renderFn(data);
        aplicarDataTable(tableId);
    } catch (e) { }
}

function aplicarDataTable(tbodyId) {
    const table = document.getElementById(tbodyId).closest('table');
    if ($.fn.DataTable.isDataTable(table)) {
        $(table).DataTable().destroy();
    }
    $(table).DataTable({
        language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
        pageLength: 5,
        lengthMenu: [5, 10, 25],
        aaSorting: [] 
    });
}

// --- RENDERIZADORES ---

function renderTarjetas(data) {
    const tbody = document.getElementById('tablaTarjetas');
    tbody.innerHTML = '';
    // Crear encabezados si no existen (para DataTables)
    const thead = tbody.parentElement.querySelector('thead');
    if(!thead.innerHTML.trim()) {
        thead.innerHTML = `<tr><th>Orden</th><th>Icono</th><th>Título</th><th>Desc</th><th>Acción</th></tr>`;
    }

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.orden}</td>
                <td><span class="material-symbols-outlined">${item.icono}</span></td>
                <td>${item.titulo}</td>
                <td>${item.descripcion}</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-edit" data-id="${item.id}" data-type="tarjetas">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${item.id}" data-type="tarjetas">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </td>
            </tr>`;
    });
}

function renderAcordeon(data) {
    const tbody = document.getElementById('tablaAcordeon');
    tbody.innerHTML = '';
    const thead = tbody.parentElement.querySelector('thead');
    if(!thead.innerHTML.trim()) {
        thead.innerHTML = `<tr><th>Orden</th><th>Título</th><th>Contenido</th><th>Acción</th></tr>`;
    }

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.orden}</td>
                <td>${item.titulo}</td>
                <td>${item.contenido.substring(0, 40)}...</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-edit" data-id="${item.id}" data-type="acordeon">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${item.id}" data-type="acordeon">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </td>
            </tr>`;
    });
}

function renderUsuarios(data) {
    const tbody = document.getElementById('tablaUsuarios');
    tbody.innerHTML = '';
    const thead = tbody.parentElement.querySelector('thead');
    if(!thead.innerHTML.trim()) {
        thead.innerHTML = `<tr><th>Fecha</th><th>Usuario</th><th>Email</th><th>Acción</th></tr>`;
    }

    data.forEach(item => {
        const id = item.id_usuarios || item.id;
        const fecha = new Date(item.fecha_registro).toLocaleDateString();
        tbody.innerHTML += `
            <tr>
                <td>${fecha}</td>
                <td>${item.nombre_usuario}</td>
                <td>${item.correo_electronico}</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-edit" data-id="${id}" data-type="usuarios">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${id}" data-type="usuarios">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </td>
            </tr>`;
    });
}

// --- MODAL EDICIÓN ---

function abrirModalEditar(type, id) {
    const item = cache[type].find(i => (i.id || i.id_usuarios) == id);
    if (!item) return alert("No encontrado");

    document.getElementById('editId').value = id;
    document.getElementById('editType').value = type;

    const f1 = document.getElementById('editField1'); // Titulo/Nombre
    const f2 = document.getElementById('editField2'); // Desc/Email
    const f3 = document.getElementById('editField3'); // Orden
    const f4 = document.getElementById('editField4'); // Icono

    // Resetear visibilidad (mostrar todo por defecto)
    f3.parentElement.classList.remove('d-none');
    f4.parentElement.classList.remove('d-none');

    if (type === 'tarjetas') {
        f1.value = item.titulo;
        f2.value = item.descripcion;
        f3.value = item.orden;
        f4.value = item.icono;
    } else if (type === 'acordeon') {
        f1.value = item.titulo;
        f2.value = item.contenido;
        f3.value = item.orden;
        f4.parentElement.classList.add('d-none'); // Ocultar icono
    } else if (type === 'usuarios') {
        f1.value = item.nombre_usuario;
        f2.value = item.correo_electronico;
        f3.parentElement.classList.add('d-none'); // Ocultar orden
        f4.parentElement.classList.add('d-none'); // Ocultar icono
    }

    new bootstrap.Modal(document.getElementById('modalEdicion')).show();
}

// --- HELPERS ---

async function apiRequest(url, method, data) {
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : null
        });
        if (!res.ok) throw new Error('Error');
        if (method !== 'GET') alert('Operación exitosa');
    } catch (e) { alert(e.message); }
}

async function eliminarItem(type, id) {
    if(!confirm("¿Eliminar?")) return;
    const url = type === 'usuarios' ? `/api/admin/users/${id}` : `/api/info/admin/${type}/${id}`;
    await apiRequest(url, 'DELETE');
    actualizarTablas();
}