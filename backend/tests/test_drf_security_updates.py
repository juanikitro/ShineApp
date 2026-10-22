"""Bounded synthetic regressions for the DRF October 2026 advisories."""

import bz2
from io import BytesIO

import pytest
from django.urls import reverse
from rest_framework import serializers
from rest_framework.authtoken.models import Token, TokenProxy
from rest_framework.exceptions import NotAcceptable, ParseError
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.parsers import JSONParser
from rest_framework.renderers import JSONRenderer
from rest_framework.request import Request
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.utils.mediatypes import order_by_precedence


def test_json_charset_cannot_decompress_request_body():
    # Small fixture only; no decompression bomb or production endpoint.
    compressed = bz2.compress(b'{"synthetic": true}')
    with pytest.raises(ParseError, match="Unsupported charset"):
        JSONParser().parse(BytesIO(compressed), parser_context={"encoding": "bz2_codec"})


@pytest.mark.parametrize("encoding", ["utf-8", "utf-16", "latin-1"])
def test_supported_text_charsets_keep_working(encoding):
    assert JSONParser().parse(BytesIO('{"name": "Peña"}'.encode(encoding)),
                              parser_context={"encoding": encoding}) == {"name": "Peña"}


@pytest.mark.parametrize("accept", ["x" * 8193, ",".join(["text/plain"] * 64 + ["application/json"])])
def test_oversized_accept_input_is_bounded(accept):
    request = Request(APIRequestFactory().get("/", HTTP_ACCEPT=accept))
    with pytest.raises(NotAcceptable):
        DefaultContentNegotiation().select_renderer(request, [JSONRenderer()])


def test_normal_content_negotiation_and_string_precedence_remain_compatible():
    request = Request(APIRequestFactory().get("/", HTTP_ACCEPT="application/json"))
    renderer, media_type = DefaultContentNegotiation().select_renderer(request, [JSONRenderer()])
    assert isinstance(renderer, JSONRenderer)
    assert media_type == "application/json"
    assert order_by_precedence(["*/*", "application/json"]) == [{"application/json"}, {"*/*"}]


@pytest.mark.django_db
def test_proxy_token_revocation_rejects_the_previous_credential(api_client):
    user = api_client.user
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    assert client.get(reverse("auth-me")).status_code == 200
    TokenProxy.objects.get(user=user).delete()
    assert not Token.objects.filter(key=token.key).exists()
    assert client.get(reverse("auth-me")).status_code == 401


def test_list_serializer_error_shape_preserves_the_existing_contract():
    class Item(serializers.Serializer):
        amount = serializers.IntegerField(min_value=0)

    serializer = Item(data=[{"amount": 1}, {"amount": -1}], many=True)
    assert not serializer.is_valid()
    assert isinstance(serializer.errors, list)
    assert serializer.errors[0] == {}
    assert "amount" in serializer.errors[1]
