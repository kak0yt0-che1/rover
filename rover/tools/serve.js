// Tiny static file server for tests. Optional URL prefix proves the game works under a repo subpath.
const http = require("http"), fs = require("fs"), path = require("path");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".md": "text/plain" };
exports.start = function (root, prefix = "", port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let u = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
      if (prefix) { if (!u.startsWith(prefix)) { res.writeHead(404); return res.end("outside prefix"); } u = u.slice(prefix.length); }
      if (u === "" || u.endsWith("/")) u += "index.html";
      const f = path.join(root, u);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
    });
    srv.listen(port, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${srv.address().port}${prefix}/`, close: () => srv.close() }));
  });
};
