"""The API end to end: places, options, labels, charts and every error path (no guessing)."""

import xml.etree.ElementTree as ET

import pytest
from fastapi.testclient import TestClient

from kundli_api import create_app
from kundli_core import palette


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    web = tmp_path_factory.mktemp("web")
    (web / "index.html").write_text("<!doctype html><title>Kundli</title>", encoding="utf-8")
    return TestClient(create_app(web_dir=web))


def place_id(client, query, label):
    hits = client.get("/api/places", params={"q": query, "limit": 50}).json()
    return next(h["id"] for h in hits if h["label"] == label)


def chart(client, **kw):
    body = {"name": "Test", "date": "1992-03-11", "time": "06:14", "place_id": place_id(client, "kuala lumpur", "Kuala Lumpur, Malaysia")}
    body.update(kw)
    return client.post("/api/chart", json=body)


def test_health_and_options(client):
    assert client.get("/api/health").json() == {"status": "ok", "places": 722,
                                               "ayanamsas": ["lahiri", "raman", "kp_old", "kp_new"]}
    opts = client.get("/api/ayanamsas").json()
    assert [o["id"] for o in opts if o["default"]] == ["lahiri"]
    assert {o["name"] for o in opts} == {"Lahiri", "Raman", "KP Old", "KP New"}


def test_places(client):
    hits = client.get("/api/places", params={"q": "chennai"}).json()
    assert hits[0]["label"] == "Chennai, India" and hits[0]["tz"] == "Asia/Kolkata" and hits[0]["usable"]
    assert client.get("/api/places", params={"q": ""}).json() == []
    assert len(client.get("/api/places", params={"q": "india", "limit": 3}).json()) == 3
    assert client.get("/api/places", params={"q": "x", "limit": 0}).status_code == 422


@pytest.mark.parametrize("lang, sample", [("en", "Aries"), ("ta", "மேஷம்"), ("sa", "मेष")])
def test_labels(client, lang, sample):
    assert client.get("/api/labels", params={"lang": lang}).json()["rasi.MESHA"] == sample
    assert client.get("/api/labels", params={"lang": "fr"}).status_code == 422


def test_chart_kuala_lumpur(client):
    res = chart(client)
    assert res.status_code == 200, res.text
    d = res.json()
    assert d["birth"]["utc"] == "1992-03-10T22:14:00+00:00" and d["birth"]["utc_offset"] == "+08:00"
    assert d["ayanamsa"]["id"] == "lahiri" and d["ayanamsa"]["dms"].startswith("23°45′")
    assert d["lagna"]["rasi"] == "KUMBHA" and d["lagna"]["lord"] == "SHANI"
    rows = {r["graha"]: r for r in d["rows"]}
    assert list(rows) == ["SURYA", "CHANDRA", "MANGALA", "BUDHA", "GURU", "SHUKRA", "SHANI", "RAHU", "KETU"]
    sun = rows["SURYA"]
    assert (sun["rasi"], sun["bhava_whole_sign"], sun["bhava_chalit"], sun["bhava_differs"]) == ("KUMBHA", 1, 2, True)
    assert sun["dignity"] == "SHATRU_KSHETRA" and sun["categories_whole_sign"] == ["KENDRA", "TRIKONA"]
    assert rows["MANGALA"]["dignity"] == "UCCHA" and rows["BUDHA"]["dignity"] == "NEECHA"
    assert rows["RAHU"]["retrograde"] and rows["KETU"]["retrograde"] and rows["RAHU"]["lord_of"] == []
    assert d["warnings"] == [] and d["chalit_method"].startswith("Bhava chalit")
    svg = ET.fromstring(d["chart_svg"])
    assert svg.get("lang") == "en"


def test_chart_follows_options(client):
    a = chart(client, ayanamsa="kp_new", lang="ta").json()
    assert a["ayanamsa"]["name"] == "KP New" and ET.fromstring(a["chart_svg"]).get("lang") == "ta"
    lahiri = chart(client).json()
    assert a["rows"][0]["longitude"] != lahiri["rows"][0]["longitude"]
    assert chart(client, time="06:14:30").json()["birth"]["local"] == "1992-03-11T06:14:30"


def test_country_centre_warns(client):
    india = place_id(client, "india", "India")
    d = chart(client, place_id=india).json()
    assert d["warnings"] and "centre of India" in d["warnings"][0]


def test_multi_zone_country_centre_is_refused(client):
    res = chart(client, place_id=place_id(client, "malaysia", "Malaysia"))
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "place_not_usable"


def test_nonexistent_local_time(client):
    res = chart(client, date="1981-12-31", time="23:45")
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert detail["code"] == "nonexistent_time" and detail["offsets"] == ["+07:30", "+08:00"]


def test_ambiguous_local_time_needs_fold(client):
    ny = place_id(client, "new york", "New York, USA")
    res = chart(client, place_id=ny, date="2021-11-07", time="01:30")
    assert res.status_code == 400
    assert res.json()["detail"]["choices"] == [{"fold": 0, "utc_offset": "-04:00"}, {"fold": 1, "utc_offset": "-05:00"}]
    assert chart(client, place_id=ny, date="2021-11-07", time="01:30", fold=1).json()["birth"]["utc"] == "2021-11-07T06:30:00+00:00"
    gap = chart(client, place_id=ny, date="2021-03-14", time="02:30")
    assert gap.status_code == 400 and gap.json()["detail"]["code"] == "nonexistent_time"


@pytest.mark.parametrize(
    "body, status, code",
    [
        ({"place_id": 999999}, 404, "unknown_place"),
        ({"date": "1750-06-01"}, 422, "date_out_of_range"),
        ({"date": "2023-02-30"}, 422, None),
        ({"time": "25:00"}, 422, None),
        ({"time": "06:14+08:00"}, 422, None),
        ({"ayanamsa": "fagan"}, 422, None),
        ({"lang": "fr"}, 422, None),
        ({"fold": 2}, 422, None),
        ({"name": "x" * 101}, 422, None),
        ({"extra": 1}, 422, None),
    ],
)
def test_bad_requests(client, body, status, code):
    res = chart(client, **body)
    assert res.status_code == status, res.text
    if code:
        assert res.json()["detail"]["code"] == code


def test_southern_hemisphere_and_high_latitude(client):
    bali = chart(client, place_id=place_id(client, "bali", "Bali, Indonesia"), date="1987-11-03", time="09:40").json()
    assert bali["input"]["place"]["latitude"] < 0 and bali["birth"]["utc_offset"] == "+08:00"
    iceland = chart(client, place_id=place_id(client, "iceland", "Iceland"), date="1975-06-21", time="23:50").json()
    assert iceland["input"]["place"]["latitude"] > 64
    for d in (bali, iceland):
        assert len(d["rows"]) == 9 and 0 <= d["lagna"]["longitude"] < 360


def test_theme_css_and_static_page(client):
    css = client.get("/theme.css")
    assert css.headers["content-type"].startswith("text/css")
    for name, hex_ in palette().colours.items():
        assert f"--{name.replace('_', '-')}: {hex_};" in css.text
    assert "<title>Kundli</title>" in client.get("/").text


def test_without_web_directory(tmp_path):
    c = TestClient(create_app(web_dir=tmp_path / "missing"))
    assert c.get("/api/health").status_code == 200
    assert c.get("/").status_code == 404
