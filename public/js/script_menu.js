// ====== VARIABLES GLOBALES ======
let datosUsuario = {
    cicloConfigurado: false,
    ultimoPeriodo: null,
    duracionCiclo: 28
};

let calendar;
let listaSintomasCache = [];

// ====== SEGURIDAD Y SESIÓN ======

// Esta función se ejecuta al inicio para proteger la página
function verificarSesion() {
    const token = localStorage.getItem('supabase_token');
    if (!token) {
        // Usamos 'replace' para que esta visita no se guarde en el historial
        // Esto evita que el botón "Atrás" funcione para volver aquí
        window.location.replace('/'); 
        return false;
    }
    return true;
}

function getUserTokenOrThrow() {
    const token = localStorage.getItem('supabase_token');
    if (!token) {
        window.location.replace('/');
        throw new Error('Sesión expirada');
    }
    return token;
}

function getUserIdOrThrow() {
    const uid = localStorage.getItem('user_id');
    if (!uid) {
        window.location.replace('/');
        throw new Error('Usuario no identificado');
    }
    return uid;
}

// ====== INICIALIZACIÓN ======
document.addEventListener('DOMContentLoaded', function () {
    // 1. Verificar seguridad antes de cargar nada
    if (!verificarSesion()) return;

    // 2. Iniciar App
    inicializarAplicacion();
    mostrarConsejoDelDia();

    // 3. Configurar Logout (Cierre de sesión seguro)
    const logoutFn = (e) => {
        e.preventDefault();
        localStorage.clear(); // Borra credenciales
        window.location.replace('/'); // Redirige y borra historial
    };
    
    const btn1 = document.getElementById('btnLogout');
    const btn2 = document.getElementById('btnLogoutMobile');
    if(btn1) btn1.addEventListener('click', logoutFn);
    if(btn2) btn2.addEventListener('click', logoutFn);
});

// ====== API HELPERS ======
async function apiFetch(url, options = {}) {
    const token = getUserTokenOrThrow();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
    };
    const res = await fetch(url, { ...options, headers });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    return data;
}

// ====== CARGA DE DATOS ======
async function inicializarAplicacion() {
    cargarDatosPerfil();
    inicializarCalendario();
    configurarNavegacion();
    crearParticulas();
    configurarEventosBotones();

    try {
        // Cargas paralelas para mayor velocidad
        await Promise.all([
            cargarCatalogoSintomas(),
            cargarCiclosDesdeBackend(),
            cargarInfoDinamica()
        ]);
    } catch (e) { 
        // Errores silenciosos en carga inicial para no bloquear la UI
    }
}

function cargarDatosPerfil() {
    const email = localStorage.getItem('user_email') || 'Usuario';
    const uEl = document.getElementById('perfil-username');
    const eEl = document.getElementById('perfil-email');
    const navEl = document.getElementById('nav-username');
    
    if(eEl) eEl.textContent = email;
    if(uEl) uEl.textContent = 'Bienvenida';
    if(navEl) navEl.textContent = 'Cuenta';
}

// ====== LÓGICA DE CICLOS ======
async function cargarCiclosDesdeBackend() {
    try {
        const res = await apiFetch('/api/ciclos');
        const ciclos = Array.isArray(res) ? res : (res.data || []);
        
        if (ciclos.length > 0) {
            const ult = ciclos[0]; 
            datosUsuario.cicloConfigurado = true;
            datosUsuario.ultimoPeriodo = ult.fecha_inicio;
            datosUsuario.duracionCiclo = ult.duracion_ciclo;
            
            actualizarEstadisticas();
            if(calendar) calendar.refetchEvents();
        } else {
            datosUsuario.cicloConfigurado = false;
            const modalEl = document.getElementById('modalRegistroInicial');
            if(modalEl) new bootstrap.Modal(modalEl).show();
        }
    } catch (error) { }
}

async function guardarCicloInicial() {
    const fecha = document.getElementById('ultimoPeriodo').value;
    const duracion = parseInt(document.getElementById('duracionCiclo').value);
    const btn = document.getElementById('btnGuardarRegistroInicial');

    if (!fecha || !duracion) return alert("Completa los datos requeridos.");

    try {
        btn.textContent = "Guardando..."; btn.disabled = true;
        
        await apiFetch('/api/ciclos', {
            method: 'POST',
            body: JSON.stringify({ fecha_inicio: fecha, duracion_ciclo: duracion, duracion_sangrado: 5 })
        });
        
        datosUsuario.cicloConfigurado = true;
        datosUsuario.ultimoPeriodo = fecha;
        datosUsuario.duracionCiclo = duracion;
        
        alert("Ciclo configurado correctamente.");
        
        bootstrap.Modal.getInstance(document.getElementById('modalRegistroInicial')).hide();
        calendar.refetchEvents();
        actualizarEstadisticas();
        
        const regBtn = document.getElementById('registro-texto');
        if(regBtn) regBtn.textContent = "Registrar";

    } catch (e) { 
        alert('Error: ' + e.message); 
    } finally { 
        btn.textContent = "Guardar"; btn.disabled = false; 
    }
}

// ====== CALENDARIO ======
function inicializarCalendario() {
    const el = document.getElementById('calendar');
    if (!el) return;

    calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        locale: 'es',
        firstDay: 1,
        headerToolbar: { left: 'prev,next', center: 'title', right: 'dayGridMonth' },
        height: 'auto', 
        events: async function(info, cb, fail) {
            try {
                let evs = [];
                if (datosUsuario.cicloConfigurado && datosUsuario.ultimoPeriodo) {
                    evs = evs.concat(generarPrediccionesMatematicas());
                }
                const dbRegs = await apiFetch('/api/registro-sintomas/mis-registros');
                if (dbRegs && Array.isArray(dbRegs)) {
                    evs = evs.concat(dbRegs.map(reg => ({
                        title: reg.fk_sintomas ? reg.fk_sintomas.nombre_sintoma : 'Síntoma',
                        start: reg.fecha,
                        color: '#ff9800',
                        allDay: true
                    })));
                }
                cb(evs);
            } catch (e) { fail(e); }
        },
        dateClick: function (info) { abrirModalSintoma(info.dateStr); }
    });
    calendar.render();
}

function generarPrediccionesMatematicas() {
    const ev = [];
    const ult = new Date(datosUsuario.ultimoPeriodo);
    const dur = datosUsuario.duracionCiclo;

    for (let i = 0; i < 6; i++) {
        const ini = new Date(ult); ini.setDate(ini.getDate() + (i * dur));
        for (let j = 0; j < 5; j++) { 
            const d = new Date(ini); d.setDate(d.getDate() + j);
            ev.push({ start: d.toISOString().split('T')[0], display: 'background', color: '#e91e63' });
        }
        const ovu = new Date(ini); ovu.setDate(ovu.getDate() + 14); 
        ev.push({ title: 'Ovulación', start: ovu.toISOString().split('T')[0], color: '#ff9800' });
        const f1 = new Date(ini); f1.setDate(f1.getDate() + 10);
        const f2 = new Date(ini); f2.setDate(f2.getDate() + 15);
        ev.push({ start: f1.toISOString().split('T')[0], end: f2.toISOString().split('T')[0], display: 'background', color: '#4caf50', opacity: 0.3 });
    }
    return ev;
}

// ====== SÍNTOMAS ======
async function cargarCatalogoSintomas() {
    try {
        const datos = await apiFetch('/api/registro-sintomas/lista-sintomas');
        listaSintomasCache = datos;
        const sel = document.getElementById('selectSintoma');
        if (sel) {
            sel.innerHTML = '<option value="" selected disabled>Selecciona...</option>';
            datos.forEach(s => sel.innerHTML += `<option value="${s.id_sintomas}">${s.nombre_sintoma}</option>`);
        }
    } catch (e) { }
}

function abrirModalSintoma(fecha) {
    document.getElementById('fechaSintoma').value = fecha;
    const sel = document.getElementById('selectSintoma');
    const chk = document.getElementById('checkOtroSintoma');
    
    sel.value = ""; sel.disabled = false; chk.checked = false;
    document.getElementById('divNuevoSintoma').classList.add('d-none');
    document.getElementById('inputNuevoSintoma').value = "";
    document.getElementById('intensidadSintoma').value = 2;

    new bootstrap.Modal(document.getElementById('modalSintoma')).show();
}

async function guardarSintoma() {
    const btn = document.getElementById('btnGuardarSintoma');
    const fecha = document.getElementById('fechaSintoma').value;
    const inten = document.getElementById('intensidadSintoma').value;
    const esNuevo = document.getElementById('checkOtroSintoma').checked;
    const inpNew = document.getElementById('inputNuevoSintoma');
    const sel = document.getElementById('selectSintoma');

    let body = { fk_usuario: getUserIdOrThrow(), fecha, intensidad: inten, fk_ciclo: null };

    if (esNuevo) {
        const txt = inpNew.value.trim();
        if (!txt) return alert("Por favor escribe el síntoma.");
        body.nuevo_sintoma = txt; body.fk_sintomas = null;
    } else {
        const id = sel.value;
        if (!id) return alert("Por favor selecciona un síntoma.");
        body.fk_sintomas = id; body.nuevo_sintoma = null;
    }

    try {
        btn.textContent = "Guardando..."; btn.disabled = true;
        await apiFetch('/api/registro-sintomas', { method: 'POST', body: JSON.stringify(body) });
        
        alert('Síntoma registrado correctamente.');
        if (esNuevo) await cargarCatalogoSintomas();
        
        const tit = esNuevo ? body.nuevo_sintoma : sel.options[sel.selectedIndex].text;
        if(calendar) calendar.addEvent({ title: tit, start: fecha, color: '#ff9800', allDay: true });
        
        bootstrap.Modal.getInstance(document.getElementById('modalSintoma')).hide();
    } catch (e) { 
        alert('Error: ' + e.message); 
    } finally { 
        btn.textContent = "Guardar"; btn.disabled = false; 
    }
}

// ====== INFO DINÁMICA ======
async function cargarInfoDinamica() {
    try {
        const resTarjetas = await fetch('/api/info/tarjetas');
        const tarjetas = await resTarjetas.json();
        renderizarTarjetas(tarjetas);

        const resAcordeon = await fetch('/api/info/acordeon');
        const acordeon = await resAcordeon.json();
        renderizarAcordeon(acordeon);
    } catch (error) { }
}

function renderizarTarjetas(data) {
    const cont = document.getElementById('contenedor-tarjetas-info');
    if(!cont) return;
    cont.innerHTML = '';
    if(data.length === 0) {
        cont.innerHTML = '<p class="text-center text-muted">Sin información disponible.</p>';
        return;
    }
    data.forEach(item => {
        cont.innerHTML += `
            <div class="col-md-4 mb-3">
                <div class="shadow-card p-3 text-center h-100">
                    <span class="material-symbols-outlined icono-info">${item.icono}</span>
                    <h6 class="card-title mt-2">${item.titulo}</h6>
                    <p class="small text-muted">${item.descripcion}</p>
                </div>
            </div>`;
    });
}

function renderizarAcordeon(data) {
    const cont = document.getElementById('acordeonFases');
    if(!cont) return;
    cont.innerHTML = '';
    data.forEach((item, idx) => {
        const show = idx === 0 ? 'show' : '';
        const collapsed = idx === 0 ? '' : 'collapsed';
        cont.innerHTML += `
            <div class="accordion-item border-0">
                <h2 class="accordion-header">
                    <button class="accordion-button ${collapsed} fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#item-${item.id}">
                        ${item.titulo}
                    </button>
                </h2>
                <div id="item-${item.id}" class="accordion-collapse collapse ${show}" data-bs-parent="#acordeonFases">
                    <div class="accordion-body text-muted small" style="background-color: #fffbfd;">
                        ${item.contenido}
                    </div>
                </div>
            </div>`;
    });
}

// ====== EVENTOS UI ======
function configurarEventosBotones() {
    document.getElementById('btnGuardarRegistroInicial')?.addEventListener('click', guardarCicloInicial);
    document.getElementById('btnGuardarSintoma')?.addEventListener('click', guardarSintoma);

    const chk = document.getElementById('checkOtroSintoma');
    if(chk) {
        chk.addEventListener('change', function() {
            document.getElementById('divNuevoSintoma').classList.toggle('d-none', !this.checked);
            document.getElementById('selectSintoma').disabled = this.checked;
            if(this.checked) document.getElementById('selectSintoma').value = "";
        });
    }

    const btnCiclo = document.getElementById('btn_ciclo');
    if (btnCiclo) {
        btnCiclo.addEventListener('click', () => {
            if (datosUsuario.cicloConfigurado) {
                new bootstrap.Modal(document.getElementById('modalCicloExistente')).show();
            } else {
                document.getElementById('ultimoPeriodo').value = new Date().toISOString().split('T')[0];
                new bootstrap.Modal(document.getElementById('modalRegistroInicial')).show();
            }
        });
    }

    const btnNuevoCiclo = document.getElementById('btnIniciarNuevoCiclo');
    if (btnNuevoCiclo) {
        btnNuevoCiclo.addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('modalCicloExistente')).hide();
            document.getElementById('ultimoPeriodo').value = new Date().toISOString().split('T')[0];
            const dur = datosUsuario.duracionCiclo || 28;
            document.getElementById('duracionCiclo').value = dur;
            new bootstrap.Modal(document.getElementById('modalRegistroInicial')).show();
        });
    }

    const btnSintoma = document.getElementById('btn_registro');
    if (btnSintoma) {
        btnSintoma.addEventListener('click', () => {
            abrirModalSintoma(new Date().toISOString().split('T')[0]);
        });
    }
}

function configurarNavegacion() {
    const map = { 'btn_calendario': 'seccion-calendario', 'btn_estadisticas': 'seccion-estadisticas', 'btn_informativa': 'seccion-informativa' };
    Object.keys(map).forEach(key => {
        const btn = document.getElementById(key);
        if(!btn) return;
        btn.addEventListener('click', function() {
            Object.keys(map).forEach(k => {
                document.getElementById(map[k])?.classList.add('d-none');
                document.getElementById(k)?.classList.remove('active');
            });
            document.getElementById(map[key])?.classList.remove('d-none');
            this.classList.add('active');
            
            if (key === 'btn_estadisticas') actualizarEstadisticas();
            if (key === 'btn_calendario' && calendar) setTimeout(() => calendar.render(), 100);
        });
    });
}

function actualizarEstadisticas() {
    if (!datosUsuario.cicloConfigurado) return;
    const ult = new Date(datosUsuario.ultimoPeriodo);
    const hoy = new Date();
    const dur = datosUsuario.duracionCiclo;
    const diff = Math.ceil(Math.abs(hoy - ult) / (1000 * 60 * 60 * 24));
    
    document.getElementById('duracion-promedio').textContent = dur + " días";
    document.getElementById('ciclo-actual').textContent = "Día " + ((diff % dur) || dur);
    document.getElementById('proximo-periodo').textContent = (dur - ((diff % dur) || dur)) + " días";
}

function mostrarConsejoDelDia() {
    const consejos = ["Bebe suficiente agua.", "Haz respiraciones profundas.", "El té de jengibre ayuda.", "Prioriza dormir bien.", "Evita cafeína.", "Come rico en hierro."];
    const div = document.getElementById("consejo-diario");
    if(div) div.textContent = "Consejo: " + consejos[Math.floor(Math.random() * consejos.length)];
}

function crearParticulas() {
    const c = document.getElementById('headerParticles');
    if (!c) return;
    for(let i=0; i<10; i++){
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random()*100 + '%';
        p.style.animationDelay = Math.random()*5 + 's';
        c.appendChild(p);
    }
}