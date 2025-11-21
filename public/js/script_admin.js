document.addEventListener('DOMContentLoaded', () => {
    // 1. PROTECCIÓN: Verificar si es admin
    if (localStorage.getItem('flowly_is_admin') !== 'true') {
        alert("Acceso denegado.");
        window.location.href = '/';
        return;
    }

    cargarTarjetas();
    cargarAcordeon();

    // Logout
    document.getElementById('btnSalirAdmin').addEventListener('click', () => {
        localStorage.removeItem('flowly_is_admin');
        window.location.href = '/';
    });

    // --- LOGICA TARJETAS ---
    document.getElementById('formNuevaTarjeta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            icono: document.getElementById('cardIcono').value,
            titulo: document.getElementById('cardTitulo').value,
            descripcion: document.getElementById('cardDesc').value,
            orden: document.getElementById('cardOrden').value
        };
        await enviarDatos('/api/info/admin/tarjetas', body);
        cargarTarjetas();
        e.target.reset();
    });

    // --- LOGICA ACORDEON ---
    document.getElementById('formNuevoAcordeon').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            titulo: document.getElementById('accTitulo').value,
            contenido: document.getElementById('accContenido').value,
            orden: document.getElementById('accOrden').value
        };
        await enviarDatos('/api/info/admin/acordeon', body);
        cargarAcordeon();
        e.target.reset();
    });
});

// --- FUNCIONES HELPER ---

async function enviarDatos(url, data) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error guardando');
        alert('Guardado correctamente');
    } catch (e) {
        alert(e.message);
    }
}

async function eliminarItem(tipo, id) {
    if(!confirm("¿Seguro que quieres borrar este elemento?")) return;
    try {
        await fetch(`/api/info/admin/${tipo}/${id}`, { method: 'DELETE' });
        if(tipo === 'tarjetas') cargarTarjetas();
        else cargarAcordeon();
    } catch (e) { alert(e.message); }
}

async function cargarTarjetas() {
    const res = await fetch('/api/info/tarjetas');
    const data = await res.json();
    const tbody = document.getElementById('tablaTarjetas');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.orden}</td>
                <td><span class="material-symbols-outlined">${item.icono}</span> (${item.icono})</td>
                <td class="fw-bold">${item.titulo}</td>
                <td>${item.descripcion}</td>
                <td class="text-end">
                    <span class="material-symbols-outlined btn-delete" onclick="eliminarItem('tarjetas', ${item.id})">delete</span>
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
        tbody.innerHTML += `
            <tr>
                <td>${item.orden}</td>
                <td class="fw-bold">${item.titulo}</td>
                <td>${item.contenido.substring(0, 50)}...</td>
                <td class="text-end">
                    <span class="material-symbols-outlined btn-delete" onclick="eliminarItem('acordeon', ${item.id})">delete</span>
                </td>
            </tr>
        `;
    });
}