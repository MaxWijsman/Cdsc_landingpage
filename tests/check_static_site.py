"""Dependency-free publication checks, runnable with Python 3.11 Alpine."""
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote, urljoin
from urllib.request import urlopen
import re


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


class Assets(HTMLParser):
    def handle_starttag(self, tag, attributes):
        for name, value in attributes:
            if name in ("src", "href") and value and value.startswith("./"):
                check_reference(PUBLIC, value)


def check_reference(parent, reference):
    target = (parent / reference.split("#", 1)[0].split("?", 1)[0]).resolve()
    assert target.is_relative_to(PUBLIC), f"Asset escapes public/: {reference}"
    assert target.is_file() and target.stat().st_size, f"Missing asset: {target}"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    assert (PUBLIC / "index.html").is_file()
    Assets().feed((PUBLIC / "index.html").read_text(encoding="utf-8"))
    for stylesheet in PUBLIC.rglob("*.css"):
        for reference in re.findall(r'url\([\"\']?(\./[^\"\')]+)[\"\']?\)', stylesheet.read_text(encoding="utf-8")):
            check_reference(stylesheet.parent, reference)
    files = sorted(path for path in PUBLIC.rglob("*") if path.is_file())
    for directory, prefix in [(PUBLIC, "/"), (ROOT, "/public/")]:
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(directory)))
        Thread(target=server.serve_forever, daemon=True).start()
        try:
            base = f"http://127.0.0.1:{server.server_port}{prefix}"
            for relative in [""] + [path.relative_to(PUBLIC).as_posix() for path in files]:
                with urlopen(urljoin(base, quote(relative)), timeout=5) as response:
                    assert response.status == 200 and response.read(), relative
                    if relative.endswith(".js"):
                        assert response.headers.get_content_type() in ("text/javascript", "application/javascript"), relative
                    if relative.endswith(".css"):
                        assert response.headers.get_content_type() == "text/css", relative
            print(f"PASS {prefix}: homepage and {len(files)} static files, including all learning assets")
        finally:
            server.shutdown()
            server.server_close()
    print("Static publication checks passed.")


if __name__ == "__main__":
    main()
