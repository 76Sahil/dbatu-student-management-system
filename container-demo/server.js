const http = require('node:http');
const port = process.env.PORT || 10000;

http
  .createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok' }));
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Newly created container is running on Render.\n');
  })
  .listen(port, () => console.log(`Listening on ${port}`));
