import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.frontend import mount_frontend


@pytest.fixture
def site(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>")
    (dist / "assets" / "main.js").write_text("console.log(1)")
    (tmp_path / "secret.txt").write_text("outside dist")
    app = FastAPI()

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    mount_frontend(app, dist)
    return TestClient(app)


def test_serves_built_files(site):
    assert site.get("/assets/main.js").text == "console.log(1)"


def test_client_routes_get_index_html(site):
    for path in ["/", "/modules/ccc601", "/settings"]:
        response = site.get(path)
        assert response.status_code == 200
        assert response.text == "<html>app</html>"


def test_api_routes_still_win_and_unknown_api_paths_404(site):
    assert site.get("/api/health").json() == {"status": "ok"}
    assert site.get("/api/nope").status_code == 404


def test_cannot_read_files_outside_dist(site):
    assert site.get("/..%2Fsecret.txt").text == "<html>app</html>"
