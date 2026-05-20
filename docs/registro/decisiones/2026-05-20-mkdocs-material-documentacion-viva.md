# MkDocs Material para documentacion viva

## Decision

Usar MkDocs Material como capa navegable sobre `docs/`, en lugar de Docusaurus o Nextra.

## Motivo

ShineApp ya tiene documentacion Markdown plana como fuente de verdad y CI Python disponible. MkDocs permite configurar el sitio con YAML simple, busqueda y build estricto sin introducir una segunda app React/Next ni MDX como formato nuevo.

## Consecuencias

- Las dependencias docs quedan aisladas en `requirements-docs.txt`.
- El sitio se valida con `mkdocs build --strict`.
- Los indices generados deben usar contenido real de cada Markdown, no nombres de archivos como documentacion inventada.
- Cualquier deploy de docs queda como opcion futura y requiere confirmacion humana explicita.
