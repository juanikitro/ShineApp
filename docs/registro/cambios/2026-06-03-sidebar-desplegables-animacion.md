# Animacion de despliegue en el sidebar

## Cambio

Las secciones desplegables del sidebar ahora revelan su grupo de hijos con una animacion breve de entrada: fade combinado con un leve deslizamiento vertical (`translateY`) cuando el grupo se expande.

- La animacion vive en `.nav-children` (`frontend/app/styles/shell.css`) como keyframes `nav-children-reveal`.
- Usa los tokens de motion existentes: `--motion-duration-base` y `--motion-ease-emphasis`, con distancia `--motion-distance-sm`.
- El chevron del padre ya rotaba con transicion; este cambio acompana esa rotacion con la aparicion suave del contenido.
- Respeta `prefers-reduced-motion` sin codigo extra: el reset global de `frontend/app/styles/forms.css` neutraliza la animacion cuando el usuario lo pide.

## Criterio

Pedido puramente visual para hacer los desplegables mas amigables. Se mantuvo el diff chico y en CSS: no se toco el JSX de `SidebarNav.tsx`, ni la logica, ni el contrato del componente, ni los tests. El grupo de hijos se sigue montando solo cuando esta expandido, asi que no hay cambios de accesibilidad ni foco oculto.
