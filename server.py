import http.server
import socketserver
import socket

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/t12_dashboard.html'
        return super().do_GET()

    def log_message(self, format, *args):
        pass

class ReuseServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReuseServer(("0.0.0.0", 5000), Handler) as httpd:
    httpd.serve_forever()
