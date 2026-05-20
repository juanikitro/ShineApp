# Auditoria UI/UX - ShineApp CRM

## Resumen ejecutivo

ShineApp ya tiene una base funcional real de CRM operativo: login, dashboard, agenda/trabajos, clientes, proveedores, caja, materiales, cotizaciones, configuracion y modales de alta/edicion. No se siente como maqueta vacia. Se siente como herramienta interna/MVP util.

El problema es que todavia no alcanza nivel SaaS premium ni demo vendible consistente. Hoy comunica "app funcional para operar" mas que "producto serio, claro y confiable para vender". La brecha principal no esta en poner mas color ni mas efectos. Esta en:

- arquitectura visual y de informacion inconsistente,
- shell mobile muy debil,
- controles muertos o ambiguos,
- accesibilidad parcial en patrones base,
- deuda de frontend que hace dificil sostener consistencia.

Diagnostico corto: **buen MVP operativo, UX media, UI correcta pero irregular, responsive flojo, design system incompleto y mantenibilidad baja**.

## Diagnostico general

### Que tipo de CRM es

ShineApp es un CRM/ERP operativo para negocios de car detailing, lavado y estetica vehicular. No es un CRM comercial clasico de leads. Es un sistema de operacion diaria con foco en:

- reservas y agenda,
- clientes y vehiculos,
- trabajos/ordenes,
- caja y deudas,
- materiales y herramientas,
- cotizaciones.

### Usuarios principales

- dueno/a o empleador del local,
- operador/a administrativo del taller,
- recepcionista o persona que agenda, cobra y hace seguimiento,
- eventualmente empleado con permisos mas limitados.

### Tareas criticas del usuario

- entrar rapido y entender el estado del dia,
- crear y mover reservas,
- registrar trabajos y cobros,
- consultar cliente, historial y proxima accion,
- controlar caja y deuda,
- registrar compras/consumos,
- editar configuracion operativa sin perder contexto.

### Posicionamiento inferido

Hoy el producto esta entre:

- **MVP funcional serio**,
- **herramienta interna/prototipo operativo**,
- con aspiracion clara a **SaaS vertical vendible**.

No se ve amateur en el sentido de "hack visual". Pero tampoco se ve todavia al nivel de HubSpot/Pipedrive/Attio/Linear en claridad, coherencia y polish.

### Confianza, velocidad y profesionalismo

La UI comunica:

- confianza funcional: media,
- velocidad operativa: media,
- profesionalismo visual: medio-bajo a medio,
- percepcion premium: baja.

El principal motivo es que la base visual esta razonablemente ordenada, pero varios detalles rompen la sensacion de producto pulido:

- mobile sacrifica demasiado la operacion,
- sidebar y settings no escalan bien,
- hay texto con encoding roto,
- el sistema visual tiene excepciones visibles,
- algunos componentes clave no estan resueltos con semantica/accessibility de nivel SaaS.

## Pantallas y superficies revisadas

### Revisadas visualmente en runtime

- Login (`next start` en `http://127.0.0.1:3001/`)
- Dashboard desktop
- Dashboard mobile
- Clientes listado desktop
- Cliente dashboard desktop
- Trabajos/Agenda desktop
- Trabajos/Agenda mobile
- Caja desktop
- Configuracion > Negocio desktop
- Configuracion > Negocio mobile
- Modal `Nuevo cliente`
- Dark mode: chequeo puntual con evidencia de inestabilidad en `next dev`

### Revisadas por codigo y estructura

- Sidebar shell
- topbar / page header
- theme switch
- search global y busquedas por modulo
- proveedores
- vehiculos
- servicios
- deudas
- materiales
- herramientas
- cotizaciones
- settings: caja / agenda / usuarios / historial
- modales base
- toast/feedback
- `SearchSelect`
- `StatusPill`
- motion layer

## Nivel actual del producto

**Nivel actual:** MVP funcional con base de CRM SaaS, pero todavia lejos de "premium".

En comparacion conceptual con SaaS/CRMs modernos:

- **como Linear**: le falta control fino de densidad, navegacion compacta y consistencia global.
- **como Attio/Folk**: le falta mejor manejo contextual de entidades, acciones y jerarquia.
- **como HubSpot/Pipedrive**: le falta pulir flujos comerciales/operativos y estados de lista/tabla.
- **como Airtable/Monday**: le falta mejor tratamiento del trabajo denso en mobile y en vistas configurables.
- **como Notion**: le falta calma y economia de elementos en estados vacios y configuracion.

## Puntaje General

**5.2 / 10**

## Puntaje Por Categoria

| Categoria | Puntaje | Lectura |
|---|---:|---|
| Flujo de tareas UX | 5.5 | Los flujos base existen, pero tienen friccion y nomenclatura irregular. |
| Diseno visual | 5.8 | Correcto y sobrio, pero no premium ni totalmente consistente. |
| Sistema de diseno | 4.2 | Hay tokens y primitives, pero con fugas, excepciones y patrones mezclados. |
| Accesibilidad | 4.3 | Hay foco visible y varios `aria-*`, pero faltan semanticas base, modal completo y patrones robustos. |
| Responsive | 3.4 | Es la categoria mas debil. Mobile no esta resuelto como superficie operativa seria. |
| UX especifica de CRM | 5.6 | Buena ambicion operativa, pero falta claridad contextual y velocidad real. |
| Mantenibilidad frontend | 3.1 | Mucha logica y render en un solo archivo; alto riesgo para consistencia futura. |
| Preparacion para demo/venta | 4.4 | Se puede mostrar, pero hoy expone demasiadas aristas de MVP y riesgos de runtime dev. |

## Principales problemas

1. **Shell mobile deficiente**: la navegacion ocupa la primera pantalla completa y posterga el trabajo real.
2. **Arquitectura de informacion ambigua**: el producto apunta a `Agenda`, pero la seccion principal sigue llamandose `Trabajos`.
3. **Control muerto**: el buscador del sidebar no hace nada.
4. **Patron invalido en listas**: tarjetas interactivas con acciones hijas generan HTML/teclado ambiguo.
5. **Configuracion no escala bien**: tabs horizontales y layout de formularios no resisten mobile premium.
6. **Sistema de diseno no consolidado**: hay tokens, pero tambien hex sueltos y componentes one-off visibles.
7. **Frontend monolitico**: `frontend/app/page.tsx` concentra demasiadas responsabilidades.
8. **Accesibilidad incompleta**: modales sin `Escape` ni focus trap; `SearchSelect` sin semantica completa de combobox.
9. **Percepcion visual irregular**: toggle de tema y algunas superficies rompen el tono sobrio del CRM.
10. **Copy/render con artefactos**: aparecen `Â·` en la UI.

## Principales oportunidades

1. Rehacer el shell mobile como header + drawer compacto.
2. Normalizar navegacion y nombres de secciones con el modelo real del producto.
3. Resolver primero los componentes base de alto impacto: sidebar, tabs, cards, modal, select, empty state.
4. Eliminar controles decorativos o muertos.
5. Transformar listas y dashboards en superficies mas contextuales y menos genericas.
6. Unificar espaciado, densidad y comportamiento de acciones.
7. Hacer que estados vacios/loading/error se sientan intencionales.
8. Separar presentacion por modulo para poder escalar sin reintroducir inconsistencias.

## Hallazgos por categoria

### 1. Flujo De Tareas UX

Lo bueno:

- Las entidades principales estan visibles y relativamente bien agrupadas.
- Caja, clientes y agenda expresan tareas reales del negocio.
- Los modales mantienen el contexto de trabajo atras, lo cual es correcto para un CRM operativo.

Lo flojo:

- El flujo principal no tiene una narrativa unica: `Dashboard`, `Trabajos`, `Clientes`, `Caja` y `Configuracion` compiten sin una jerarquia fuerte.
- La decision de producto "Agenda como superficie operativa principal" no termina de verse en la UI.
- En mobile la primera tarea es cerrar/atravesar la navegacion, no operar.
- Hay demasiada diferencia entre secciones: algunas son operativas, otras son listados CRUD casi puros.

### 2. UI visual

Lo bueno:

- La direccion general clara/gris/blanco funciona para un CRM.
- La marca no invade.
- Los paneles blancos sobre canvas gris dan una base sobria y util.

Lo flojo:

- La densidad visual no esta calibrada: algunas pantallas quedan correctas, otras se ven vacias o estiradas.
- Hay componentes que parecen de otro sistema, especialmente el theme switch.
- Las cards/listas se sienten repetitivas y poco informativas.
- Las superficies vacias pierden interes visual y jerarquia.

### 3. Sistema De Diseno

Lo bueno:

- Existe una capa de tokens en `frontend/app/styles/tokens.css`.
- Hay primitives reutilizables (`Field`, `Panel`, `MetricCard`, `RecordCard`, `DetailModal`, `SearchSelect`).

Lo flojo:

- El repo todavia no opera como sistema consistente.
- El toggle de tema ignora la austeridad del resto.
- Persisten colores hardcodeados y detalles fuera del token layer.
- La semantica de listas, tabs, filtros y acciones no esta lo bastante normalizada.

### 4. Accesibilidad

Lo bueno:

- Hay `focus-visible`.
- Existen `aria-label` en varios icon buttons.
- Los toasts usan `aria-live`.

Lo flojo:

- Los modales no muestran manejo completo de teclado.
- `SearchSelect` no expone semantica rica de combobox/listbox.
- Hay tarjetas interactivas con botones hijos.
- Login y auth fields no tienen `autocomplete` apropiado.

### 5. Responsive

Es la mayor deuda visible.

- En <=980px el sidebar deja de ser sidebar y pasa a ser una grilla larga antes del contenido.
- `Agenda` fuerza scroll horizontal amplio.
- `Configuracion` mantiene tabs horizontales que se cortan y no comunican bien el scroll.
- El contenido principal arranca demasiado abajo en mobile.

### 6. UX Especifica De CRM

Lo bueno:

- Existen dashboards de cliente/servicio/proveedor.
- Caja tiene vocacion operativa y no solo administrativa.
- Agenda tiene multiples vistas.

Lo flojo:

- Falta "next best action" mas explicita.
- Falta velocidad operativa en listados densos: bulk actions, acciones contextuales, filtros mas claros.
- Falta mejor balance entre overview y accion inmediata.

### 7. Mantenibilidad Frontend

- `frontend/app/page.tsx` tiene 15144 lineas.
- Hay 59 helpers `render*` en el mismo archivo.
- Hay 74 usos de `SearchSelect` en `page.tsx`.
- El shell entero depende de estado local para navegacion, modales y vistas.

Esto frena:

- consistencia,
- pruebas,
- onboarding,
- cambios visuales seguros,
- evolucion a producto mas grande.

## Benchmark conceptual

Principios aplicables que hoy faltan o estan incompletos:

- **HubSpot / Pipedrive**: una jerarquia mas clara entre overview, lista y accion primaria.
- **Linear**: densidad compacta sin ruido, sidebar mas inteligente y menos dominante.
- **Attio / Folk**: cards/listas mas contextuales, menos CRUD generico.
- **Notion**: estados vacios y settings mas calmos, menos rozamiento.
- **Airtable / Monday**: mejor manejo de superficies configurables y de trabajo denso.
- **Salesforce Lightning**: mayor claridad de contexto cuando se entra a dashboards de entidad.

No hace falta copiar ninguna de esas UIs. Hace falta adoptar sus principios:

- un shell que no estorbe,
- una accion primaria evidente,
- densidad controlada,
- componentes base fuertes,
- deep-linking,
- estados consistentes,
- mejor uso del espacio.

## Limitaciones de la auditoria

- Varias pantallas estaban con datos escasos o vacios, sobre todo `Agenda`.
- La revision de permisos fue mayormente desde codigo; en runtime se uso el usuario demo empleador.
- En `next dev` aparecio una inestabilidad de HMR/CSS/manifest que afecto capturas frescas. El `build` de produccion paso y el login en `next start` renderizo estable.
- No se hizo prueba manual con lector de pantalla; la auditoria de accesibilidad fue DOM/teclado/semantica/codigo.

## Veredicto

ShineApp no necesita "redisenarse de cero". Necesita una secuencia disciplinada de mejoras:

1. shell y responsive,
2. componentes base,
3. pantallas criticas,
4. accesibilidad,
5. polish premium.

La base existe. Lo que falta es convertirla en sistema.
