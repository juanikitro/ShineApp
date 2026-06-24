import logging
import json
from urllib.error import HTTPError, URLError
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
    def send_template(self, message):
        raise WhatsAppProviderError("Twilio todavía no está implementado en este MVP.")

    def send_text(self, message):
        raise WhatsAppProviderError("Twilio todavía no está implementado en este MVP.")


def provider_for_config(config):
    if config.provider == WhatsAppConfig.Provider.FAKE:
        return FakeWhatsAppProvider(config)
    if config.provider == WhatsAppConfig.Provider.META:
        return MetaCloudWhatsAppProvider(config)
    if config.provider == WhatsAppConfig.Provider.TWILIO:
        return TwilioWhatsAppProvider(config)
    raise WhatsAppProviderError(f"Provider de WhatsApp no soportado: {config.provider}")
