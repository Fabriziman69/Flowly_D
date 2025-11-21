document.addEventListener('DOMContentLoaded', () => {
    // Protección de ruta
    if (localStorage.getItem('flowly_is_admin') !== 'true') {
        alert("Acceso denegado.");
        window.location.href = '/';
        return;
    }

    cargarTarjetas();
    cargarAcordeon();

    // Botón Logout
    document.getElementById('btnSalirAdmin').addEventListener('click', () => {
        localStorage.removeItem('flowly_is_admin');
        window.location.href = '/';
    });

    // Crear Tarjeta
    document.getElementById('formNuevaTarjeta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            icono: document.getElementById('cardIcono').value,
            titulo: document.getElementById('cardTitulo').value,
            descripcion: document.getElementById('cardDesc').value,
            orden: document.getElementById('cardOrden').value
        };
        await realizarPeticion('/api/info/admin/tarjetas', 'POST', body);
        cargarTarjetas();
        e.target.reset();
    });

    // Crear Acordeón
    document.getElementById('formNuevoAcordeon').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            titulo: document.getElementById('accTitulo').value,
            contenido: document.getElementById('accContenido').value,
            orden: document.getElementById('accOrden').value
        };
        await realizarPeticion('/api/info/admin/acordeon', 'POST', body);
        cargarAcordeon();
        e.target.reset();
    });

    // Guardar Edición (UPDATE)
    document.getElementById('btnGuardarEdicion').addEventListener('click', async () => {
        const id = document.getElementById('editId').value;
        const type = document.getElementById('editType').value;
        
        const body = {
            orden: document.getElementById('editOrden').value,
            titulo: document.getElementById('editTitulo').value
        };

        // Diferenciar campos según el tipo
        if (type === 'tarjetas') {
            body.icono = document.getElementById('editIcono').value;
            body.descripcion = document.getElementById('editContenido').value;
        } else {
            body.contenido = document.getElementById('editContenido').value;
        }

        await realizarPeticion(`/api/info/admin/${type}/${id}`, 'PUT', body);
        
        // Cerrar modal y recargar
        const modalEl = document.getElementById('modalEditar');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        if (type === 'tarjetas') cargarTarjetas();
        else cargarAcordeon();
    });
});

// --- Funciones Helper ---

async function realizarPeticion(url, method, data = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);

        const res = await fetch(url, options);
        if (!res.ok) throw new Error('Error en la operación');
        
        if (method !== 'GET') alert('Operación exitosa');
        return await res.json();
    } catch (e) {
        alert(e.message);
    }
}

async function eliminarItem(tipo, id) {
    if(!confirm("¿Seguro que quieres borrar este elemento?")) return;
    await realizarPeticion(`/api/info/admin/${tipo}/${id}`, 'DELETE');
    if(tipo === 'tarjetas') cargarTarjetas();
    else cargarAcordeon();
}

// --- Funciones de Carga y Renderizado ---

async function cargarTarjetas() {
    const res = await fetch('/api/info/tarjetas');
    const data = await res.json();
    const tbody = document.getElementById('tablaTarjetas');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        // Pasamos los datos al botón de editar como atributos data-
        tbody.innerHTML += `
            <tr>
                <td>${item.orden}</td>
                <td><span class="material-symbols-outlined">${item.icono}</span></td>
                <td class="fw-bold">${item.titulo}</td>
                <td>${item.descripcion}</td>
                <td class="text-end">
                    <span class="material-symbols-outlined btn-action btn-edit" 
                          onclick="abrirModalEditar('tarjetas', '${item.id}', '${item.titulo}', '${item.descripcion}', '${item.orden}', '${item.icono}')">
                          edit
                    </span>
                    <span class="material-symbols-outlined btn-action btn-delete" 
                          onclick="eliminarItem('tarjetas', ${item.id})">
                          delete
                    </span>
                </td>
            </tr>
        `;
    });
}

async function cargarAcordeon() {
    const res = await fetch('/api/info/acordeon');
    const data = await res.json();
    const tbody = document.getElementById('tablaAcordeon');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        // Cortar texto largo para la tabla
        const contenidoCorto = item.contenido.length > 50 ? item.contenido.substring(0, 50) + '...' : item.contenido;
        
        // Pasamos contenido completo (escapado) al editar
        // Usamos encodeURIComponent para evitar errores con comillas en el texto
        const contenidoSafe = encodeURIComponent(item.contenido);

        tbody.innerHTML += `
            <tr>
                <td>${item.orden}</td>
                <td class="fw-bold">${item.titulo}</td>
                <td>${contenidoCorto}</td>
                <td class="text-end">
                    <span class="material-symbols-outlined btn-action btn-edit" 
                          onclick="abrirModalEditar('acordeon', '${item.id}', '${item.titulo}', '${contenidoSafe}', '${item.orden}', null)">
                          edit
                    </span>
                    <span class="material-symbols-outlined btn-action btn-delete" 
                          onclick="eliminarItem('acordeon', ${item.id})">
                          delete
                    </span>
                </td>
            </tr>
        `;
    });
}

// Función para abrir el modal y rellenarlo
window.abrirModalEditar = function(type, id, titulo, contenido, orden, icono) {
    document.getElementById('editId').value = id;
    document.getElementById('editType').value = type;
    document.getElementById('editTitulo').value = titulo;
    document.getElementById('editOrden').value = orden;
    
    // Decodificar contenido si viene de acordeón
    if (type === 'acordeon') {
        document.getElementById('editContenido').value = decodeURIComponent(contenido);
        document.getElementById('divEditIcono').classList.add('d-none'); // Ocultar input icono
    } else {
        document.getElementById('editContenido').value = contenido;
        document.getElementById('editIcono').value = icono;
        document.getElementById('divEditIcono').classList.remove('d-none'); // Mostrar input icono
    }

    const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
    modal.show();
};