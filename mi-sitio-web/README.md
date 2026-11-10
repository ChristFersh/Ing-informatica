# Mi página web personal — Christian Diaz

Proyecto final de **Fundamentos de Ingeniería Informática**: sitio de 4 páginas hecho con HTML, CSS y JavaScript. La única librería externa es el web component de [Iconify](https://iconify.design/docs/iconify-icon/) para los íconos.

## Íconos (web component de Iconify)

Los íconos se escriben como una etiqueta HTML propia: `<iconify-icon icon="fluent:laptop-24-regular"></iconify-icon>`. El script `iconify-icon.min.js` (cargado desde jsDelivr al final de cada página) registra esa etiqueta y dibuja el SVG.

- Set usado: **Fluent UI System Icons** (`fluent:`), versión regular de 24 px. Catálogo: https://icon-sets.iconify.design/fluent/
- Fluent no tiene logos de marcas, así que GitHub, LinkedIn y X usan **Remix Icon** (`ri:`), que tiene el mismo estilo de línea.
- El ícono mide `1em` y toma el color del texto (`currentColor`): se cambia con `font-size` y `color` en CSS.
- JavaScript cambia el ícono con `setAttribute('icon', ...)`: luna/sol en el botón de tema y ☰/X en el menú.
- **Necesita internet**: el script y los íconos se descargan de la red. Sin conexión, el sitio funciona pero los íconos no se ven.

## Cómo abrirlo

- Doble clic en `index.html`, o
- En VS Code: clic derecho sobre `index.html` → **Open with Live Server**.

## Estructura de archivos

```
mi-sitio-web/
├── index.html      # Inicio: presentación, servicios, proyectos destacados y habilidades
├── about.html      # Acerca de: biografía, educación, tabla de herramientas e intereses
├── projects.html   # Proyectos: 7 proyectos de GitHub con filtro por categoría
├── contact.html    # Contacto: datos y formulario validado con JavaScript
├── css/
│   └── styles.css  # Todos los estilos (una sola hoja externa)
├── js/
│   └── main.js     # Toda la interactividad (un solo archivo para las 4 páginas)
└── img/
    ├── christian-diaz.webp
    ├── infect-cozy.webp
    └── smile-school.jpg
```

## Cómo cumple la rúbrica

| Criterio | Dónde está |
|---|---|
| Estructura HTML semántica | `header`, `nav`, `main`, `section`, `article`, `footer` en las 4 páginas. Un solo `h1` por página y los títulos van en orden (h1 → h2 → h3). |
| Contenido y elementos | Textos, listas (`ul`), imágenes con `alt`, enlaces que funcionan, **formulario** (`contact.html`) y **tabla** (`about.html`). |
| CSS externo con selectores de etiqueta, clase e id | Etiqueta: `body`, `a`, `h1`, `label`. Clase: `.btn`, `.project-card`. Id: `#theme-toggle`, `#contact-form`, `#form-success`. Sin estilos en línea en el HTML. |
| Diseño adaptable | Flexbox (header, tarjetas, footer), Grid (`.projects-grid`) y dos media queries: 992px (tablet) y 768px (celular). |
| JavaScript: al menos dos funcionalidades | Cinco: menú para celular, modo oscuro, barras de habilidades, filtro de proyectos y validación del formulario. |
| Calidad del código JS | Variables (`const`, `let`), condicionales (`if / else`), funciones con nombre, eventos (`click`, `submit`) y comentarios en cada bloque. |
| Archivos separados | `index.html` en la raíz, `css/`, `js/` e `img/`. |

## Errores de la guía que se corrigieron

1. **Dos estructuras distintas.** La sección 2 usa `about.html`, `css/styles.css` y `js/main.js`; la última sección usa `paginas/acerca.html`, `../css/estilos.css` y `../js/script.js`. Si se mezclan, los enlaces se rompen. Se dejó una sola: la de la sección 2.
2. **`main.js` está incompleto.** Termina en `const contactForm = ...` sin cerrar el `DOMContentLoaded`: da error de sintaxis en la consola y no funciona nada.
3. **`script.js` repite lo de `main.js`** (menú y scroll suave) y usa clases que no existen en el HTML (`.progress`, `data-progress`, `.card`, `.destacados`, `.habilidades`, `.placeholder-img`). Se dejó un solo archivo JS.
4. **Estilos en línea** en las barras de habilidades (`style="width: 90%"`). La rúbrica los penaliza. Ahora el porcentaje va en `data-level="90"` y JavaScript pone el ancho.
5. **CSS escrito dentro del JavaScript** (`style.innerHTML = ...`). Se pasó todo a `styles.css`.
6. **Enlaces rotos** (`href="#"` en redes sociales y en "Descargar CV"). Ahora apuntan a GitHub, LinkedIn y X.
7. **Faltaban páginas y estilos.** No había `projects.html` ni `contact.html`, el footer de `acerca.html` estaba cortado y clases como `.about-grid`, `.page-header` o `.interest-card` no tenían CSS.
8. **Dos `h1` por página** (el logo y el título). Ahora el logo es un enlace y cada página tiene un solo `h1`.
9. **El botón del menú era un `div`**, que no se puede usar con teclado. Ahora es un `<button>`.
10. **No había formulario ni tabla**, que la rúbrica pide. Se agregaron los dos.

## Guía para la sustentación

**HTML.** Las 4 páginas comparten el mismo `header` y `footer`. Lo único que cambia en el menú es cuál enlace tiene la clase `active`. Cada página tiene un `main` dividido en `section`. Mostrar el formulario (`label` + `input` con el mismo `id`) y la tabla (`thead`, `tbody`, `th scope`).

**CSS.** Empieza con variables en `:root` (colores, espacios, fuentes). El modo oscuro solo cambia esas variables dentro de `body.dark-mode`, así que todo el sitio cambia de color con una sola clase. Flexbox ordena el header y las tarjetas; Grid arma la cuadrícula de proyectos. Al final están las media queries: en 768px el menú se esconde y aparece el botón ☰.

**JavaScript** (`js/main.js`, de arriba hacia abajo):

1. **Menú para celular:** al hacer `click` en el botón, `classList.toggle('active')` muestra u oculta el `nav` y el ícono cambia de ☰ a X.
2. **Modo oscuro:** `cambiarTema()` pone o quita la clase `dark-mode`, cambia el ícono (luna/sol) y guarda la elección con `localStorage`, por eso se mantiene al cambiar de página.
3. **Barras de habilidades:** lee `data-level` de cada barra y le pone ese ancho. La animación la hace CSS con `transition`.
4. **Filtro de proyectos:** cada botón tiene `data-filter` y cada tarjeta `data-category`. Si no coinciden, la tarjeta recibe la clase `hidden`.
5. **Formulario:** `preventDefault()` evita que la página se recargue; `validarFormulario()` revisa cada campo con `if` y muestra el error debajo. El correo se revisa con una expresión regular.

## Datos para revisar antes de entregar

- Porcentajes de habilidades (`index.html`): son una estimación, ajústalos a tu gusto.
- Educación (`about.html`): falta el nombre de tu universidad y las fechas.
- Correo de contacto: es el que aparece en tu perfil de GitHub.
