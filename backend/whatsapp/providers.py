import base64
import logging
import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings

from .models import WhatsAppConfig

logger = logging.getLogger("shineapp.whatsapp")


class WhatsAppProviderError(Exception):
    pass


class BaseWhatsAppProvider:
    def __init__(self, config):
        self.config = config

    def send_template(self, message):
        raise NotImplementedError

    def send_text(self, message):
        raise NotImplementedError


class FakeWhatsAppProvider(BaseWhatsAppProvider):
    def send_template(self, message):
        return {
            "id": f"fake-wa-{message.id}",
            "response": {"provider": "fake", "status": "sent"},
        }

    def send_text(self, message):
        return self.send_template(message)


class MetaCloudWhatsAppProvider(BaseWhatsAppProvider):
    def _token(self):
        return self.config.access_token or getattr(settings, "WHATSAPP_META_ACCESS_TOKEN", "")

    def _phone_number_id(self):
        return self.config.phone_number_id or getattr(settings, "WHATSAPP_META_PHONE_NUMBER_ID", "")

    def _post(self, payload):
        token = self._token()
        phone_number_id = self._phone_number_id()
        if not token or not phone_number_id:
            raise WhatsAppProviderError("Falta configurar token o phone_number_id de WhatsApp.")
        version = getattr(settings, "WHATSAPP_META_API_VERSION", "v20.0")
        timeout = getattr(settings, "WHATSAPP_TIMEOUT_SECONDS", 10)
        url = f"https://graph.facebook.com/{version}/{phone_number_id}/messages"
        request = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=timeout) as response:  # noqa: S310 - URL is Meta API.
                raw = response.read().decode("utf-8")
                data = json.loads(raw or "{}")
        except HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(raw or "{}")
            except ValueError:
                data = {"text": raw[:1000]}
            raise WhatsAppProviderError(str(data)[:2000]) from exc
        except (URLError, TimeoutError) as exc:
            raise WhatsAppProviderError(str(exc)[:2000]) from exc
        except ValueError as exc:
            raise WhatsAppProviderError("Respuesta inválida del provider de WhatsApp.") from exc
        message_id = ""
        messages = data.get("messages")
        if isinstance(messages, list) and messages:
            message_id = str(messages[0].get("id") or "")
        return {"id": message_id, "response": data}

    def send_template(self, message):
        template = message.template
        if template is None:
            raise WhatsAppProviderError("El mensaje no tiene template asociado.")
        variables = message.template_variables or {}
        components = []
        body_vars = template.variables_schema if isinstance(template.variables_schema, list) else []
        if body_vars:
            components.append(
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(variables.get(name, ""))}
                        for name in body_vars
                    ],
                }
            )
        payload = {
            "messaging_product": "whatsapp",
            "to": message.recipient_phone,
            "type": "template",
            "template": {
                "name": template.provider_template_name,
                "language": {"code": template.language},
            },
        }
        if components:
            payload["template"]["components"] = components
        return self._post(payload)

    def send_text(self, message):
        payload = {
            "messaging_product": "whatsapp",
            "to": message.recipient_phone,
            "type": "text",
            "text": {"preview_url": False, "body": message.rendered_body},
        }
        return self._post(payload)


class TwilioWhatsAppProvider(BaseWhatsAppProvider):
    """Twilio WhatsApp API: envia texto libre o Content API para templates aprobados.

    Mapeo de config: business_account_id = Account SID, access_token = Auth Token,
    phone_number_id = número emisor (acepta "whatsapp:+1...", "+1..." o dígitos).
    """

    def _account_sid(self):
        return (self.config.business_account_id or "").strip()

    def _auth_token(self):
        return (self.config.access_token or "").strip()

    def _from_number(self):
        raw = (self.config.phone_number_id or "").strip()
        digits = re.sub(r"\D+", "", raw)
        if not digits:
            return ""
        return f"whatsapp:+{digits}"

    def _post(self, payload):
        account_sid = self._account_sid()
        auth_token = self._auth_token()
        if not account_sid or not auth_token or not payload.get("From"):
            raise WhatsAppProviderError(
                "Falta configurar credenciales de Twilio (Account SID, Auth Token y número emisor)."
            )
        payload = dict(payload)
        status_callback = getattr(settings, "WHATSAPP_STATUS_CALLBACK_URL", "")
        if status_callback and "StatusCallback" not in payload:
            payload["StatusCallback"] = status_callback
        timeout = getattr(settings, "WHATSAPP_TIMEOUT_SECONDS", 10)
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
        request = Request(
            url,
            data=urlencode(payload).encode("utf-8"),
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=timeout) as response:  # noqa: S310 - URL is Twilio API.
                raw = response.read().decode("utf-8")
                data = json.loads(raw or "{}")
        except HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(raw or "{}")
            except ValueError:
                data = {"text": raw[:1000]}
            raise WhatsAppProviderError(str(data)[:2000]) from exc
        except (URLError, TimeoutError) as exc:
            raise WhatsAppProviderError(str(exc)[:2000]) from exc
        except ValueError as exc:
            raise WhatsAppProviderError("Respuesta inválida del provider de WhatsApp.") from exc
        return {"id": str(data.get("sid") or ""), "response": data}

    def _payload_for(self, message):
        body = (message.rendered_body or "").strip()
        if not body:
            raise WhatsAppProviderError("El mensaje no tiene cuerpo renderizado para enviar por Twilio.")
        return {
            "From": self._from_number(),
            "To": f"whatsapp:+{message.recipient_phone}",
            "Body": body,
        }

    def send_template(self, message):
        template = message.template
        if template is None:
            raise WhatsAppProviderError("El mensaje no tiene template asociado.")
        content_sid = (template.twilio_content_sid or "").strip()
        if not content_sid:
            return self._post(self._payload_for(message))
        variables = message.template_variables or {}
        variable_names = template.variables_schema if isinstance(template.variables_schema, list) else []
        content_variables = {
            str(index + 1): str(variables.get(name, ""))
            for index, name in enumerate(variable_names)
        }
        return self._post(
            {
                "From": self._from_number(),
                "To": f"whatsapp:+{message.recipient_phone}",
                "ContentSid": content_sid,
                "ContentVariables": json.dumps(content_variables),
            }
        )

    def send_text(self, message):
        return self._post(self._payload_for(message))


def provider_for_config(config):
    if config.provider == WhatsAppConfig.Provider.FAKE:
        return FakeWhatsAppProvider(config)
    if config.provider == WhatsAppConfig.Provider.META:
        return MetaCloudWhatsAppProvider(config)
    if config.provider == WhatsAppConfig.Provider.TWILIO:
        return TwilioWhatsAppProvider(config)
    raise WhatsAppProviderError(f"Provider de WhatsApp no soportado: {config.provider}")
