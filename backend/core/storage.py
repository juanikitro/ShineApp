from django.conf import settings
from django.utils.encoding import filepath_to_uri
from storages.backends.s3 import S3Storage


class SupabaseS3Storage(S3Storage):
    def url(self, name, parameters=None, expire=None, http_method=None):
        public_base_url = getattr(settings, "SUPABASE_STORAGE_PUBLIC_URL", "")
        if public_base_url and not self.querystring_auth:
            path = str(name).lstrip("/")
            location = str(getattr(self, "location", "") or "").strip("/")
            if location and not path.startswith(f"{location}/"):
                path = f"{location}/{path}"
            return f"{public_base_url.rstrip('/')}/{filepath_to_uri(path)}"
        return super().url(
            name,
            parameters=parameters,
            expire=expire,
            http_method=http_method,
        )
