#!/usr/bin/env python3
"""Ontwikkelserver zonder caching, zodat een wijziging altijd meteen zichtbaar is."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class GeenCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8731), GeenCache).serve_forever()
