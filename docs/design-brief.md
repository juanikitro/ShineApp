# Resumen De Diseno

## Resumen Del Producto

ShineApp es una app de gestion operativa para centros de lavado y detailing vehicular. Se comporta mas como un CRM compacto que como un sitio vidriera: el usuario necesita moverse rapido entre clientes, vehiculos, reservas, ordenes de trabajo, caja, inventario y cotizaciones sin detenerse a decodificar la interfaz.

El frontend actual es una app Next.js practica con una shell principal y una superficie de trabajo densa. El trabajo futuro de UI debe mejorar claridad y consistencia dentro de ese modelo operativo, en vez de forzar un reset visual completo. La referencia visual actual es un CRM operativo claro: sidebar blanco, canvas gris suave, paneles blancos, texto oscuro, acciones primarias azules y acciones destructivas rojas. Tambien se soporta un dark mode navy como tema alternativo de trabajo, preservando la direccion previa `#0B2447` para uso con poca luz sin reemplazar el default claro de CRM.

## Usuario Objetivo

- Profesional del oficio u operador del local.
- Conoce el dominio del negocio, pero no necesariamente se siente comodo con software.
- Necesita reconocimiento rapido mas que exploracion.
- Se beneficia con etiquetas claras, acciones predecibles y formularios de baja friccion.

## Tono Emocional Deseado

La app debe sentirse:

- simple
- clara
- profesional
- rapida
- confiable
- moderna, pero no sobrediseniada
- calma, enfocada y seria

La UI debe sentirse como una herramienta confiable de taller, no como una app de consumo ni como un sitio de marketing.
Debe sentirse como un workspace CRM limpio para trabajo real del local: claro, ordenado, directo y facil de escanear.
En dark mode debe mantener la misma disciplina, pero con una shell navy seria, texto blanco, acentos contenidos y sin efectos brillantes.

## Principios De Diseno

1. Reducir friccion primero.
   Cada pantalla debe ayudar al usuario a terminar la tarea con minima interpretacion.

2. Hacer obvia la jerarquia.
   La accion primaria, el contexto actual, las metricas clave y el estado deben verse de un vistazo.

3. Reutilizar patrones agresivamente.
   Datos similares y acciones similares deben verse y comportarse igual entre secciones.

4. Preferir densidad calma antes que polish vacio.
   Esto es una herramienta de trabajo. Puede ser rica en informacion, pero debe seguir siendo legible.

5. Mantener los formularios fuera del workspace principal.
   La creacion y edicion deben ocurrir en popups/modales, no en una columna permanente de formulario que compita con la lista, agenda o dashboard.

6. Mantener feedback de interaccion inmediato.
   Los estados de carga, vacio, exito, advertencia y error nunca deben sentirse ambiguos.

7. Preservar confianza operativa.
   Las acciones peligrosas, dinero, estados y cambios de agenda deben ser explicitos y faciles de verificar.

8. Evitar ruido visual.
   Usar color, radio, elevacion y motion con moderacion.

## Que Debe Evitar La UI

- Gradientes decorativos como estilo default.
- Sombras excesivas, glassmorphism o cards flotantes por todos lados.
- Acciones ambiguas con el mismo peso visual.
- Espaciados, colores y estilos de botones one-off.
- Columnas permanentes de formulario junto a listas o dashboards.
- Texto de acento con bajo contraste sobre fondos blancos.
- Un canvas brillante sin suficiente encuadre gris o jerarquia de paneles.
- Interacciones ingeniosas que oculten datos o acciones importantes.
- Grandes areas hero vacias que empujen el trabajo real debajo del fold.
- Copiar directamente el lenguaje de marca de otro producto.

## Que Significa "Bueno" Para Esta App

Una buena pantalla de ShineApp debe permitir que un operador responda rapido:

- Donde estoy?
- Cual es la accion principal aca?
- Que cambio?
- Que requiere atencion?
- Que puedo hacer ahora sin riesgo?

Si una pantalla se ve pulida pero ralentiza eso, no es un buen resultado para este producto.

## Como La Paleta Sostiene La Sensacion Deseada

La paleta debe comunicar confianza, control, calma y seriedad enfocada:

- `#F8FAFC` y `#FFFFFF` sostienen el sidebar, superficies superiores, controles y cards para que la interfaz se sienta clara y accesible.
- `#E5E7EB` a `#EEF1F5` enmarcan el workspace y separan areas principales sin pesadez visual.
- `#111827` y `#4B5563` mantienen el texto legible y serio.
- `#0284C7` a `#0EA5E9` es la familia azul para acciones y links, alineada con el enfasis azul limpio de la referencia visual, manteniendo mejor contraste en botones.
- `#E00000` se reserva para acciones destructivas o de reset, siguiendo el lenguaje visual de controles de alto riesgo.
- `#0B2447`, `#19376D` y `#A5D7E8` se reservan para la identidad dark mode: canvas navy, estados de interaccion navy y detalles de foco/acento celeste palido.

Usada correctamente, la paleta produce una sensacion SaaS/CRM clara y profesional con practicidad de taller. La clave es la moderacion: la mayoria de superficies quedan blancas o gris suave, el azul marca el camino principal, el rojo marca riesgo y los bordes/sombras quedan sutiles.
