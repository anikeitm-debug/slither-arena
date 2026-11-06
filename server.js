// Online 1v1 server for Slither Arena.
// Setup:  npm i ws   then   node server.js   then open http://localhost:3000
// Keep slither-arena.html in the same folder as this file.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000;

const srv = http.createServer((req, res) => {
  fs.readFile(path.join(__dirname, 'slither-arena.html'), (err, data) => {
    if (err) { res.writeHead(500); return res.end('slither-arena.html not found next to server.js'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server: srv, maxPayload: 16 * 1024 });
let waiting = null;
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

wss.on('connection', ws => {
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'q') {                       // join the queue
      ws.nm = String(m.n || 'Player').slice(0, 14);
      ws.sk = Math.max(0, Math.min(5, m.k | 0));
      if (waiting && waiting !== ws && waiting.readyState === 1) {
        const a = waiting; waiting = null;
        a.peer = ws; ws.peer = a;
        send(a, { t: 'match', side: 0, n: ws.nm, k: ws.sk });
        send(ws, { t: 'match', side: 1, n: a.nm, k: a.sk });
      } else waiting = ws;
    } else if ((m.t === 's' || m.t === 'dead') && ws.peer) {
      send(ws.peer, m);                      // relay to opponent
    }
  });
  ws.on('close', () => {
    if (waiting === ws) waiting = null;
    if (ws.peer) { send(ws.peer, { t: 'left' }); ws.peer.peer = null; }
  });
});

srv.listen(PORT, () => console.log('Slither Arena on http://localhost:' + PORT));
