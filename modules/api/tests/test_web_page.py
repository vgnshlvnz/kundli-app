"""The web module's page as served by the API: it loads, and every label key it uses exists."""

import re
from html.parser import HTMLParser

import pytest
from fastapi.testclient import TestClient

from kundli_api import create_app
from kundli_api.app import DEFAULT_WEB_DIR

pytestmark = pytest.mark.skipif(not (DEFAULT_WEB_DIR / "index.html").is_file(), reason="web module not present")


class _Labels(HTMLParser):
    def __init__(self):
        super().__init__()
        self.keys: set[str] = set()
        self.refs: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for name in ("data-label", "data-label-placeholder"):
            if a.get(name):
                self.keys.add(a[name])
        for name in ("src", "href"):
            if a.get(name) and tag in ("script", "link"):
                self.refs.append(a[name])


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def test_page_and_assets_are_served(client):
    page = client.get("/")
    assert page.status_code == 200 and "<title>Kundli</title>" in page.text
    parser = _Labels()
    parser.feed(page.text)
    assert set(parser.refs) == {"/theme.css", "styles.css", "app.js", "favicon.svg"}
    for asset in ("/styles.css", "/app.js", "/render.js", "/theme.css", "/fonts/NotoSerifTamil-Regular.woff2"):
        assert client.get(asset).status_code == 200, asset


@pytest.mark.parametrize("lang", ["en", "ta", "sa"])
def test_every_label_key_used_by_the_page_exists(client, lang):
    labels = client.get("/api/labels", params={"lang": lang}).json()
    parser = _Labels()
    parser.feed(client.get("/").text)
    used = set(parser.keys)
    for script in ("render.js", "app.js"):
        used |= set(re.findall(r'"(ui\.[A-Z_]+)"', (DEFAULT_WEB_DIR / script).read_text(encoding="utf-8")))
    missing = sorted(k for k in used if k not in labels)
    assert not missing, missing
