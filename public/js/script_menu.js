// ====== VARIABLES GLOBALES ======
let datosUsuario = {
  cicloConfigurado: false,
  ultimoPeriodo: null,
  duracionCiclo: 28,
  registrosDiarios: []
};

let calendar;
let sintomasSeleccionados = [];

// ====== HELPERS DE AUTENTICACIÓN / API ======

function getUserTokenOrThrow() {
  const token = localStorage.getItem('supabase_token');
  if (!token) {
    alert('Debes iniciar sesión.');
    throw new Error('Falta supabase_token en localStorage');
  }
  return token;
}

async function apiFetch(url, options = {}) {
  const token = getUserTokenOrThrow();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`,
  };
  const res = await fetch(url, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
  }
  if (!res.ok) {
    const err = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(`API error: ${err}`);
  }
  return data;
}

// ====== VERIFICACIÓN DE SESIÓN ======
function verificarSesion() {
  const userId = localStorage.getItem('user_id');
  const userToken = localStorage.getItem('supabase_token');
  if (!userId || !userToken) {
    window.location.href = '/';
    return false;
  }
  return true;
}

// ====== INICIALIZACIÓN DE LA APLICACIÓN ======
document.addEventListener('DOMContentLoaded', function () {
  if (!verificarSesion()) return;

  inicializarAplicacion();
  cargarDatosUsuarioPerfil();

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('datosUsuarioMenstrual');
      window.location.href = '/';
    });
  }
});

async function inicializarAplicacion() {
  cargarDatosUsuario();
  inicializarCalendario();
  configurarNavegacion();
  crearParticulas();
  configurarEventosRegistro();
  configurarEventosSintomas();
  actualizarInterfaz();

  await cargarCiclosDesdeBackend();
}

// ====== DATOS DEL USUARIO EN EL PERFIL ======
function cargarDatosUsuarioPerfil() {
  const username = localStorage.getItem('user_name') || 'Usuario';
  const email = localStorage.getItem('user_email') || 'correo@ejemplo.com';

  const usernameEl = document.getElementById('perfil-username');
  const emailEl = document.getElementById('perfil-email');

  if (usernameEl) usernameEl.textContent = username;
  if (emailEl) emailEl.textContent = email;
}

// ====== GESTIÓN DE DATOS DEL USUARIO (LOCAL STORAGE) ======
function cargarDatosUsuario() {
  const datosGuardados = localStorage.getItem('datosUsuarioMenstrual');
  if (datosGuardados) {
    try {
      datosUsuario = JSON.parse(datosGuardados);
    } catch {
      datosUsuario = {
        cicloConfigurado: false,
        ultimoPeriodo: null,
        duracionCiclo: 28,
        registrosDiarios: []
      };
    }
  }
}

function guardarDatosUsuario() {
  localStorage.setItem('datosUsuarioMenstrual', JSON.stringify(datosUsuario));
}

// ====== CALENDARIO ======
function inicializarCalendario() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: 'es',
    firstDay: 1,
    events: generarEventosCalendario(),
    eventContent: function (info) {
      const element = document.createElement('div');
      element.className = 'fc-event-main-frame';
      element.innerHTML = `
        <div class="fc-event-title-container">
          <div class="fc-event-title fc-sticky">${info.event.title}</div>
        </div>
      `;
      return { domNodes: [element] };
    },
    dateClick: function (info) {
      abrirRegistroDiario(info.dateStr);
    }
  });

  calendar.render();
}

function generarEventosCalendario() {
  const eventos = [];

  if (datosUsuario.cicloConfigurado && datosUsuario.ultimoPeriodo) {
    const ultimoPeriodo = new Date(datosUsuario.ultimoPeriodo);
    const duracionCiclo = datosUsuario.duracionCiclo;

    for (let i = 0; i < 6; i++) {
      const inicioPeriodo = new Date(ultimoPeriodo);
      inicioPeriodo.setDate(inicioPeriodo.getDate() + (i * duracionCiclo));

      for (let j = 0; j < 5; j++) {
        const fechaMenstruacion = new Date(inicioPeriodo);
        fechaMenstruacion.setDate(fechaMenstruacion.getDate() + j);

        eventos.push({
          title: 'Periodo esperado',
          start: fechaMenstruacion.toISOString().split('T')[0],
          color: '#e91e63',
          classNames: ['fc-event-menstruacion']
        });
      }

      const inicioFertilidad = new Date(inicioPeriodo);
      inicioFertilidad.setDate(inicioFertilidad.getDate() + 10);

      const finFertilidad = new Date(inicioPeriodo);
      finFertilidad.setDate(finFertilidad.getDate() + 17);

      eventos.push({
        title: 'Ventana fértil',
        start: inicioFertilidad.toISOString().split('T')[0],
        end: finFertilidad.toISOString().split('T')[0],
        color: '#4caf50',
        classNames: ['fc-event-fertilidad']
      });

      const ovulacion = new Date(inicioPeriodo);
      ovulacion.setDate(ovulacion.getDate() + 14);

      eventos.push({
        title: 'Ovulación',
        start: ovulacion.toISOString().split('T')[0],
        color: '#ff9800',
        classNames: ['fc-event-ovulacion']
      });
    }
  }

  datosUsuario.registrosDiarios.forEach(registro => {
    eventos.push({
      title: 'Registro diario',
      start: registro.fecha,
      color: '#2196f3',
      classNames: ['fc-event-sintomas']
    });
  });

  return eventos;
}

// ====== NAVEGACIÓN ======
function configurarNavegacion() {
  const secciones = {
    'btn_calendario': 'seccion-calendario',
    'btn_estadisticas': 'seccion-estadisticas',
    'btn_informativa': 'seccion-informativa'
  };

  Object.values(secciones).forEach(seccionId => {
    const seccion = document.getElementById(seccionId);
    if (seccion) seccion.classList.add('d-none');
  });

  const seccionCalendario = document.getElementById('seccion-calendario');
  const btnCalendario = document.getElementById('btn_calendario');

  if (seccionCalendario && btnCalendario) {
    seccionCalendario.classList.remove('d-none');
    btnCalendario.classList.add('active');
  }

  Object.keys(secciones).forEach(botonId => {
    const boton = document.getElementById(botonId);
    if (boton) {
      boton.addEventListener('click', function () {
        cambiarSeccion(botonId, secciones);
      });
    }
  });
}

function cambiarSeccion(botonId, secciones) {
  Object.values(secciones).forEach(seccionId => {
    const seccion = document.getElementById(seccionId);
    if (seccion) seccion.classList.add('d-none');
  });

  Object.keys(secciones).forEach(btnId => {
    const boton = document.getElementById(btnId);
    if (boton) boton.classList.remove('active');
  });

  const seccionId = secciones[botonId];
  const seccion = document.getElementById(seccionId);
  const boton = document.getElementById(botonId);

  if (seccion && boton) {
    seccion.classList.remove('d-none');
    boton.classList.add('active');

    if (botonId === 'btn_estadisticas') {
      actualizarEstadisticasReales();
    }
  }
}

// ====== CONFIGURACIÓN DE EVENTOS PARA SÍNTOMAS ======
function configurarEventosSintomas() {
  const btnAgregarSintoma = document.getElementById('btnAgregarSintoma');
  if (btnAgregarSintoma) {
    btnAgregarSintoma.addEventListener('click', agregarSintomaDesdeFormulario);
  }

  const sintomasRapidos = document.querySelectorAll('.sintoma-rapido');
  sintomasRapidos.forEach(btn => {
    btn.addEventListener('click', function() {
      const nombre = this.getAttribute('data-nombre');
      const categoria = this.getAttribute('data-categoria');
      agregarSintomaALista(nombre, categoria, 'Moderado');
    });
  });
}

// ====== GESTIÓN DE SÍNTOMAS DINÁMICOS ======
function agregarSintomaDesdeFormulario() {
  const nombre = document.getElementById('nuevoSintomaNombre').value.trim();
  const categoria = document.getElementById('nuevoSintomaCategoria').value;
  const intensidad = document.getElementById('nuevoSintomaIntensidad').value;

  if (!nombre) {
    alert('Por favor ingresa un nombre para el síntoma');
    return;
  }

  agregarSintomaALista(nombre, categoria, intensidad);
  document.getElementById('nuevoSintomaNombre').value = '';
}

function agregarSintomaALista(nombre, categoria, intensidad) {
  const sintoma = {
    nombre_sintoma: nombre,
    categoria: categoria,
    intensidad: intensidad,
    id: Date.now()
  };

  sintomasSeleccionados.push(sintoma);
  actualizarListaSintomasUI();
}

function eliminarSintoma(id) {
  sintomasSeleccionados = sintomasSeleccionados.filter(s => s.id !== id);
  actualizarListaSintomasUI();
}

function actualizarListaSintomasUI() {
  const contenedor = document.querySelector('.sintomas-container');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (sintomasSeleccionados.length === 0) {
    contenedor.innerHTML = '<p class="text-muted">No hay síntomas agregados</p>';
    return;
  }

  sintomasSeleccionados.forEach(sintoma => {
    const sintomaEl = document.createElement('div');
    sintomaEl.className = 'alert alert-sm alert-light d-flex justify-content-between align-items-center';
    sintomaEl.innerHTML = `
      <div>
        <strong>${sintoma.nombre_sintoma}</strong> 
        <span class="badge bg-secondary">${sintoma.categoria}</span>
        <span class="badge bg-info">${sintoma.intensidad}</span>
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger" data-id="${sintoma.id}">
        <span class="material-symbols-outlined" style="font-size: 1rem;">delete</span>
      </button>
    `;

    const btnEliminar = sintomaEl.querySelector('button');
    btnEliminar.addEventListener('click', function() {
      eliminarSintoma(sintoma.id);
    });

    contenedor.appendChild(sintomaEl);
  });
}

function limpiarSintomas() {
  sintomasSeleccionados = [];
  actualizarListaSintomasUI();
}

// ====== REGISTRO MENSTRUAL ======
function configurarEventosRegistro() {
  const btnRegistro = document.getElementById('btn_registro');
  const btnGuardarRegistroInicial = document.getElementById('btnGuardarRegistroInicial');
  const btnGuardarRegistroDiario = document.getElementById('btnGuardarRegistroDiario');

  if (btnRegistro) {
    btnRegistro.addEventListener('click', function () {
      if (!datosUsuario.cicloConfigurado) {
        const modalRegistroInicial = new bootstrap.Modal(document.getElementById('modalRegistroInicial'));
        modalRegistroInicial.show();
      } else {
        abrirRegistroDiario();
      }
    });
  }

  if (btnGuardarRegistroInicial) {
    btnGuardarRegistroInicial.addEventListener('click', guardarRegistroInicial);
  }

  if (btnGuardarRegistroDiario) {
    btnGuardarRegistroDiario.addEventListener('click', guardarRegistroDiario);
  }
}

// ====== GUARDAR CICLO INICIAL EN BACKEND (RLS) ======
async function guardarRegistroInicial() {
  const ultimoPeriodo = document.getElementById('ultimoPeriodo')?.value;
  const duracionCiclo = parseInt(document.getElementById('duracionCiclo')?.value, 10);

  if (!ultimoPeriodo || !duracionCiclo) {
    alert('Por favor, completa todos los campos requeridos.');
    return;
  }

  try {
    const payload = await apiFetch('/api/ciclos', {
      method: 'POST',
      body: JSON.stringify({
        fecha_inicio: ultimoPeriodo,
        duracion_ciclo: duracionCiclo,
        duracion_sangrado: 5
      })
    });

    datosUsuario.cicloConfigurado = true;
    datosUsuario.ultimoPeriodo = ultimoPeriodo;
    datosUsuario.duracionCiclo = duracionCiclo;
    guardarDatosUsuario();
    actualizarInterfaz();

    const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistroInicial'));
    modal?.hide();

    alert('Configuración guardada exitosamente en la base de datos!');
    await cargarCiclosDesdeBackend();
  } catch (error) {
    console.error('Error guardando ciclo:', error);
    alert('Error de conexión. Los datos se guardaron localmente.');

    datosUsuario.cicloConfigurado = true;
    datosUsuario.ultimoPeriodo = ultimoPeriodo;
    datosUsuario.duracionCiclo = duracionCiclo;
    guardarDatosUsuario();
    actualizarInterfaz();

    const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistroInicial'));
    modal?.hide();
  }
}

// ====== CARGAR CICLOS DESDE BACKEND (RLS) ======
async function cargarCiclosDesdeBackend() {
  try {
    const payload = await apiFetch('/api/ciclos', {
      method: 'GET'
    });

    const ciclos = payload?.data || [];
    if (ciclos.length > 0) {
      const cicloMasReciente = ciclos[0];

      datosUsuario.cicloConfigurado = true;
      datosUsuario.ultimoPeriodo = cicloMasReciente.fecha_inicio;
      datosUsuario.duracionCiclo = cicloMasReciente.duracion_ciclo;

      guardarDatosUsuario();
      actualizarInterfaz();

      const seccionEst = document.getElementById('seccion-estadisticas');
      if (seccionEst && !seccionEst.classList.contains('d-none')) {
        actualizarEstadisticasReales(ciclos);
      }
    }
  } catch (error) {
    console.error('Error cargando ciclos:', error);
  }
}

// ====== REGISTRO DIARIO ======
async function abrirRegistroDiario(fechaEspecifica = null) {
  const fecha = fechaEspecifica || new Date().toISOString().split('T')[0];
  
  const fechaActualEl = document.getElementById('fechaActual');
  const fechaDiariaEl = document.getElementById('fechaDiaria');
  
  if (fechaActualEl) {
    fechaActualEl.textContent = formatearFecha(fecha);
  }
  if (fechaDiariaEl) {
    fechaDiariaEl.value = fecha;
  }

  document.getElementById('formRegistroDiario')?.reset();
  limpiarSintomas();

  await precargarRegistroExistente(fecha);
  
  const modal = new bootstrap.Modal(document.getElementById('modalRegistroDiario'));
  modal.show();
}

async function precargarRegistroExistente(fecha) {
  try {
    const payload = await apiFetch(`/api/registro-diario?fecha=${encodeURIComponent(fecha)}`);
    const registros = payload?.data || [];
    
    if (registros.length > 0) {
      const registro = registros[0];
      
      document.getElementById('temperatura_basal').value = registro.temperatura_basal || '';
      document.getElementById('flujo_cervical').value = registro.flujo_cervical || '';
      document.getElementById('nota_extra').value = registro.nota_extra || '';
      
      if (registro.sintomas && Array.isArray(registro.sintomas)) {
        registro.sintomas.forEach(sintoma => {
          if (sintoma.sintomas) {
            agregarSintomaALista(
              sintoma.sintomas.nombre_sintoma,
              sintoma.sintomas.categoria,
              sintoma.intensidad
            );
          }
        });
      }
    }
  } catch (error) {
    console.warn('No se encontró registro para la fecha:', fecha, error);
  }
}

async function guardarRegistroDiario() {
  const fecha = document.getElementById('fechaDiaria').value;
  const temperatura_basal = document.getElementById('temperatura_basal').value;
  const flujo_cervical = document.getElementById('flujo_cervical').value;
  const nota_extra = document.getElementById('nota_extra').value;

  const sintomasPayload = sintomasSeleccionados.map(sintoma => ({
    nombre_sintoma: sintoma.nombre_sintoma,
    categoria: sintoma.categoria,
    intensidad: sintoma.intensidad
  }));

  const body = {
    fecha: fecha,
    temperatura_basal: temperatura_basal ? parseFloat(temperatura_basal) : null,
    flujo_cervical: flujo_cervical ? parseInt(flujo_cervical) : null,
    nota_extra: nota_extra || null,
    sintomas: sintomasPayload
  };

  try {
    const resp = await apiFetch('/api/registro-diario', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (resp.success) {
      const nuevoRegistro = {
        fecha: fecha,
        temperatura_basal: body.temperatura_basal,
        flujo_cervical: body.flujo_cervical,
        nota_extra: body.nota_extra,
        sintomas: sintomasSeleccionados
      };

      const index = datosUsuario.registrosDiarios.findIndex(r => r.fecha === fecha);
      if (index !== -1) {
        datosUsuario.registrosDiarios[index] = nuevoRegistro;
      } else {
        datosUsuario.registrosDiarios.push(nuevoRegistro);
      }

      guardarDatosUsuario();

      const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistroDiario'));
      modal?.hide();

      alert('Registro diario guardado exitosamente');
      actualizarInterfaz();
    } else {
      alert('Error al guardar: ' + (resp.error || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error guardando registro diario:', error);
    alert('No se pudo guardar. Revisa tu conexión: ' + error.message);
  }
}

// ====== UI ======
function actualizarInterfaz() {
  const textoRegistro = document.getElementById('registro-texto');
  if (textoRegistro) {
    textoRegistro.textContent = datosUsuario.cicloConfigurado ? 'Registro Diario' : 'Registro';
  }

  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(generarEventosCalendario());
  }
}

// ====== ESTADÍSTICAS ======
function actualizarEstadisticas() {
  if (!datosUsuario.cicloConfigurado) {
    document.getElementById('duracion-promedio').textContent = '-- días';
    document.getElementById('ciclo-actual').textContent = 'Día --';
    document.getElementById('proximo-periodo').textContent = '-- días';
    return;
  }

  const ultimoPeriodo = new Date(datosUsuario.ultimoPeriodo);
  const hoy = new Date();
  const diffTiempo = hoy.getTime() - ultimoPeriodo.getTime();
  const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
  const diaCicloActual = (diffDias % datosUsuario.duracionCiclo) + 1;
  const diasHastaProximoPeriodo = datosUsuario.duracionCiclo - (diffDias % datosUsuario.duracionCiclo);

  document.getElementById('duracion-promedio').textContent = `${datosUsuario.duracionCiclo} días`;
  document.getElementById('ciclo-actual').textContent = `Día ${diaCicloActual}`;
  document.getElementById('proximo-periodo').textContent = `${diasHastaProximoPeriodo} días`;
}

async function actualizarEstadisticasReales(ciclosExternos = null) {
  let ciclos = ciclosExternos;

  if (!ciclos) {
    try {
      const payload = await apiFetch('/api/ciclos', { method: 'GET' });
      ciclos = payload?.data || null;
    } catch (error) {
      console.error('Error cargando ciclos para estadísticas:', error);
      ciclos = null;
    }
  }

  if (!ciclos || ciclos.length === 0) {
    actualizarEstadisticas();
    return;
  }

  const duraciones = ciclos.map(c => c.duracion_ciclo);
  const promedio = Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length);

  const cicloMasReciente = ciclos[0];
  const ultimoPeriodo = new Date(cicloMasReciente.fecha_inicio);
  const hoy = new Date();

  const diffTiempo = hoy.getTime() - ultimoPeriodo.getTime();
  const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

  const diaCicloActual = (diffDias % cicloMasReciente.duracion_ciclo) + 1;
  const diasHastaProximoPeriodo = cicloMasReciente.duracion_ciclo - (diffDias % cicloMasReciente.duracion_ciclo);

  document.getElementById('duracion-promedio').textContent = `${promedio} días (${ciclos.length} ciclos)`;
  document.getElementById('ciclo-actual').textContent = `Día ${diaCicloActual}`;
  document.getElementById('proximo-periodo').textContent = `${diasHastaProximoPeriodo} días`;
}

// ====== UTILITARIAS ======
function formatearFecha(fechaISO) {
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(fechaISO).toLocaleDateString('es-ES', opciones);
}

function crearParticulas() {
  const particlesContainer = document.getElementById('headerParticles');
  if (!particlesContainer) return;

  const particleCount = 15;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');

    const size = Math.random() * 5 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 5}s`;

    particlesContainer.appendChild(particle);
  }
}

