# Errores repetidos de agentes

Registro liviano para evitar repetir fallas operativas. Agregar una fila solo cuando el error ya ocurrio o es altamente probable en este repo.

| Patron | Causa | Prevencion | Validacion |
|---|---|---|---|
| Usar `python` en Windows y fallar por alias de Microsoft Store | El host puede no resolver `python` al runtime real | Preferir `backend/.venv/Scripts/python.exe`; si no existe, usar `py -3`; dejar `python` como ultimo fallback | `scripts/validate.ps1` selecciona Python en ese orden |
| Olvidar tests frontend existentes | `package.json` no exponia todos los `frontend/lib/*.test.mjs` | Usar `npm run test` para correr el conjunto completo de tests frontend | `node --test lib/*.test.mjs` debe pasar |
| Abrir docs largas sin necesidad | `AGENTS.md` y `docs/indice.md` repetian muchas reglas y cambios historicos | Leer `AGENTS.md`, `docs/indice.md`, archivo objetivo, tests cercanos y una guia `docs/ia/` | Revisar que la entrega cite solo contexto usado |
| Inventar contratos entre backend y frontend | Cambios full-stack sin revisar serializer, endpoint y consumidor | Antes de cambiar payloads, revisar backend y consumidor frontend; documentar contratos importantes | Tests backend + `npm run build` + prueba del flujo |
| Dar por validado algo que no corrio | Confundir build, test parcial o inspeccion manual con validacion completa | Ejecutar el comando que prueba la afirmacion o declarar validacion parcial | Incluir comando y resultado en la entrega |
