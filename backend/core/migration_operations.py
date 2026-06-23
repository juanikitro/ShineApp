"""Operaciones de migracion compartidas.

`AddIndexConcurrentlyIfPostgres` crea indices con `CREATE INDEX CONCURRENTLY` en
PostgreSQL (no toma lock ACCESS EXCLUSIVE sobre la tabla: critico en prod con
tablas grandes como AuditLog o StockMovement) y cae a un `CREATE INDEX` normal en
otros backends (SQLite en tests/dev, que no soporta CONCURRENTLY y donde el lock
no importa).

La migracion que use esta operacion DEBE declarar `atomic = False`, porque
`CREATE INDEX CONCURRENTLY` no puede ejecutarse dentro de una transaccion.

Caveat operativo (ver docs/deployment/manual-steps.md): si una creacion
CONCURRENTLY se interrumpe, Postgres deja un indice INVALID que hay que dropear
a mano antes de reintentar. En pooler de transaccion (pgBouncer) la migracion de
schema debe correr por una conexion de sesion/directa, no por el pooler.
"""

from django.db.migrations.operations.models import AddIndex


class AddIndexConcurrentlyIfPostgres(AddIndex):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.model_name)
        if not self.allow_migrate_model(schema_editor.connection.alias, model):
            return
        if schema_editor.connection.vendor == "postgresql":
            schema_editor.add_index(model, self.index, concurrently=True)
        else:
            schema_editor.add_index(model, self.index)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        model = from_state.apps.get_model(app_label, self.model_name)
        if not self.allow_migrate_model(schema_editor.connection.alias, model):
            return
        if schema_editor.connection.vendor == "postgresql":
            schema_editor.remove_index(model, self.index, concurrently=True)
        else:
            schema_editor.remove_index(model, self.index)
