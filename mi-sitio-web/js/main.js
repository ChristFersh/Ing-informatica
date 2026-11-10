document.addEventListener('DOMContentLoaded', () => {
  /* ---------- 1. Menú para celulares ---------- */
  const botonMenu = document.getElementById('mobile-menu');
  const iconoMenu = document.getElementById('menu-icon');
  const menu = document.getElementById('main-nav');

  // Abre o cierra el menú agregando o quitando la clase "active"
  function alternarMenu() {
    menu.classList.toggle('active');

    const estaAbierto = menu.classList.contains('active');
    botonMenu.setAttribute('aria-expanded', estaAbierto);

    // Cambiamos el ícono de Iconify: X para cerrar, ☰ para abrir
    if (estaAbierto) {
      iconoMenu.setAttribute('icon', 'fluent:dismiss-24-regular');
      botonMenu.setAttribute('aria-label', 'Cerrar menú');
    } else {
      iconoMenu.setAttribute('icon', 'fluent:navigation-24-regular');
      botonMenu.setAttribute('aria-label', 'Abrir menú');
    }
  }

  botonMenu.addEventListener('click', alternarMenu);


  /* ---------- 2. Modo oscuro ---------- */
  const botonTema = document.getElementById('theme-toggle');
  const iconoTema = document.getElementById('theme-icon');

  // Aplica el tema recibido: 'oscuro' o 'claro'
  function aplicarTema(tema) {
    if (tema === 'oscuro') {
      document.body.classList.add('dark-mode');
      iconoTema.setAttribute('icon', 'fluent:weather-sunny-24-regular');
      botonTema.setAttribute('aria-label', 'Activar modo claro');
    } else {
      document.body.classList.remove('dark-mode');
      iconoTema.setAttribute('icon', 'fluent:weather-moon-24-regular');
      botonTema.setAttribute('aria-label', 'Activar modo oscuro');
    }
  }

  // Cambia al tema contrario y lo guarda para las otras páginas
  function cambiarTema() {
    let nuevoTema = 'oscuro';

    if (document.body.classList.contains('dark-mode')) {
      nuevoTema = 'claro';
    }

    aplicarTema(nuevoTema);
    localStorage.setItem('tema', nuevoTema);
  }

  // Al cargar la página, usamos el tema que se guardó la última vez
  const temaGuardado = localStorage.getItem('tema');
  aplicarTema(temaGuardado);

  botonTema.addEventListener('click', cambiarTema);


  /* ---------- 3. Barras de habilidades (solo en index.html) ---------- */
  const barrasHabilidad = document.querySelectorAll('.skill-level');

  // Cada barra tiene su porcentaje en data-level (ej: data-level="90").
  // La barra empieza en 0 y CSS anima el cambio de ancho.
  function animarBarras() {
    barrasHabilidad.forEach((barra) => {
        const porcentaje = barra.dataset.level;
        barra.style.width = porcentaje + '%';
    });
  }

  if (barrasHabilidad.length > 0) {
    // Esperamos un momento para que se alcance a ver la animación
    setTimeout(animarBarras, 300);
  }


  /* ---------- 4. Filtro de proyectos (solo en projects.html) ---------- */
  const botonesFiltro = document.querySelectorAll('.filter-btn');
  const tarjetasProyecto = document.querySelectorAll('.project-card');

  // Muestra solo las tarjetas de la categoría elegida
  function filtrarProyectos(categoria) {
    tarjetasProyecto.forEach((tarjeta) => {
      if (categoria === 'todos' || tarjeta.dataset.category === categoria) {
        tarjeta.classList.remove('hidden');
      } else {
        tarjeta.classList.add('hidden');
      }
    });
  }

  botonesFiltro.forEach((boton) => {
    boton.addEventListener('click', () => {
      // Quitamos "active" de todos los botones y se lo damos al que se tocó
      botonesFiltro.forEach((otroBoton) => otroBoton.classList.remove('active'));
      boton.classList.add('active');

      filtrarProyectos(boton.dataset.filter);
    });
  });


  /* ---------- 5. Validación del formulario (solo en contact.html) ---------- */
  const formulario = document.getElementById('contact-form');

  // Muestra el mensaje de error debajo del campo y lo marca en rojo
  function mostrarError(campo, mensaje) {
    const textoError = document.getElementById('error-' + campo.id);
    textoError.textContent = mensaje;
    campo.classList.add('invalid');
  }

  // Borra el error de un campo
  function limpiarError(campo) {
    const textoError = document.getElementById('error-' + campo.id);
    textoError.textContent = '';
    campo.classList.remove('invalid');
  }

  // Revisa que el correo tenga la forma texto@texto.dominio
  function esCorreoValido(correo) {
    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return patronCorreo.test(correo);
  }

  // Revisa todos los campos; devuelve true si todo está bien
  function validarFormulario() {
    const nombre = document.getElementById('nombre');
    const correo = document.getElementById('correo');
    const asunto = document.getElementById('asunto');
    const mensaje = document.getElementById('mensaje');
    let esValido = true;

    // Nombre: obligatorio y con al menos 3 letras
    if (nombre.value.trim().length < 3) {
      mostrarError(nombre, 'Escribe tu nombre (mínimo 3 letras).');
      esValido = false;
    } else {
      limpiarError(nombre);
    }

    // Correo: obligatorio y con formato válido
    if (correo.value.trim() === '') {
      mostrarError(correo, 'Escribe tu correo electrónico.');
      esValido = false;
    } else if (!esCorreoValido(correo.value.trim())) {
      mostrarError(correo, 'El correo no es válido. Ejemplo: nombre@correo.com');
      esValido = false;
    } else {
      limpiarError(correo);
    }

    // Asunto: hay que elegir una opción
    if (asunto.value === '') {
      mostrarError(asunto, 'Elige un asunto.');
      esValido = false;
    } else {
      limpiarError(asunto);
    }

    // Mensaje: al menos 10 caracteres
    if (mensaje.value.trim().length < 10) {
      mostrarError(mensaje, 'El mensaje debe tener al menos 10 caracteres.');
      esValido = false;
    } else {
      limpiarError(mensaje);
    }

    return esValido;
  }

  // Se ejecuta cuando se presiona "Enviar mensaje"
  function enviarFormulario(evento) {
    evento.preventDefault();  // evita que la página se recargue

    const mensajeExito = document.getElementById('form-success');
    const textoExito = document.getElementById('success-text');

    if (validarFormulario()) {
      const nombre = document.getElementById('nombre').value.trim();
      textoExito.textContent = '¡Gracias, ' + nombre + '! Todos los datos están correctos.';
      mensajeExito.hidden = false;
      formulario.reset();
    } else {
      mensajeExito.hidden = true;
    }
  }

  if (formulario) {
    formulario.addEventListener('submit', enviarFormulario);
  }
});
