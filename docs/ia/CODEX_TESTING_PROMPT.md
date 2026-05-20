# Prompt para generar tests con Codex

Usar este prompt cuando se pida a Codex o a otra IA que implemente tests en ShineApp.

```text
Trabaja en ShineApp siguiendo AGENTS.md, docs/indice.md y docs/ia/TESTING.md.

Objetivo:
- Generar o ampliar tests reales para el cambio pedido.
- No modificar, borrar, relajar ni saltear tests para hacer pasar la implementacion.
- No bajar umbrales de coverage ni excluir codigo productivo para maquillar resultados.

Flujo obligatorio:
1. Descubri el contrato real leyendo solo el contexto necesario:
   - archivo objetivo,
   - tests cercanos,
   - serializer/endpoint/consumer si hay contrato backend/frontend,
   - docs tecnicas relevantes si el cambio toca reglas de negocio.
2. Lista una matriz breve de riesgos antes de testear:
   - happy path,
   - payload/estado invalido,
   - permisos o multitenancy si aplica,
   - side effects,
   - accesibilidad/interaccion en UI,
   - regresion especifica reportada.
3. Escribi primero tests que fallen por el bug o por el contrato nuevo.
   - Si el test no falla, explica por que ya estaba cubierto o ajusta el caso.
4. Implementa el minimo cambio necesario.
5. Ejecuta tests focalizados.
6. Ejecuta validacion general si el cambio no es trivial:
   powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
7. Ejecuta coverage si el cambio toca comportamiento, contratos, helpers o componentes:
   powershell -ExecutionPolicy Bypass -File .\scripts\test-coverage.ps1
8. Reporta:
   - tests agregados o actualizados,
   - riesgos cubiertos,
   - comandos ejecutados y resultado,
   - gaps reales sin maquillarlos.

Criterios:
- Backend: pytest + pytest-cov debe mantener al menos 90%.
- Frontend: Vitest + V8 debe mantener al menos 90% en statements, branches, functions y lines sobre frontend/lib/** y componentes reutilizables.
- frontend/app/page.tsx no entra al gate inicial; extrae logica nueva a lib o componentes testeables.
- Si un test existente falla, diagnostica causa raiz. No cambies la expectativa salvo evidencia de que el test contradice el contrato real.
- Si no se puede validar algo, informa causa, impacto y alternativa.
```
