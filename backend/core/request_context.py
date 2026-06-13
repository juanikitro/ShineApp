"""Contexto por-request (request_id, business_id, user_id) via contextvars.

`RequestIDMiddleware` lo inicializa al comienzo de cada request y lo consumen el
filtro de logging, el exception handler y la integracion de Sentry para
correlacionar logs, respuestas de error y eventos. Usa `contextvars`, por lo que
es seguro en sync y async y no comparte estado mutable entre requests.

El middleware SIEMPRE resetea el contexto al inicio del request (incluyendo
business/user en vacio); recien despues `business_for_user` los vuelve a setear
si el request esta autenticado. Asi un request anonimo no hereda el negocio de
un request anterior atendido por el mismo worker.
"""

import contextvars
import uuid

_request_id: "contextvars.ContextVar[str]" = contextvars.ContextVar("request_id", default="")
_business_id: "contextvars.ContextVar[str]" = contextvars.ContextVar("business_id", default="")
_user_id: "contextvars.ContextVar[str]" = contextvars.ContextVar("user_id", default="")


def new_request_id() -> str:
    return uuid.uuid4().hex


def set_request_context(*, request_id: str = "", business_id="", user_id="") -> None:
    _request_id.set(request_id or "")
    _business_id.set(str(business_id or ""))
    _user_id.set(str(user_id or ""))


def set_request_id(value: str) -> None:
    _request_id.set(value or "")


def set_actor(*, business_id="", user_id="") -> None:
    if business_id:
        _business_id.set(str(business_id))
    if user_id:
        _user_id.set(str(user_id))


def get_request_id() -> str:
    return _request_id.get()


def get_business_id() -> str:
    return _business_id.get()


def get_user_id() -> str:
    return _user_id.get()


def current_context() -> dict:
    return {
        "request_id": _request_id.get(),
        "business_id": _business_id.get(),
        "user_id": _user_id.get(),
    }
