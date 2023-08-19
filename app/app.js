const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

const port = 8000;
// const host = '172.16.1.116';
const host = 'localhost';
// const host = '192.168.1.30';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// const server = https.createServer({
//     key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
//     cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
// }, app);

const server = http.createServer(app);

module.exports = { server };

server.listen(port, host, () => {
    console.log(`HTTPS server running on http://${host}:${port}/`);
});

app.use(cors('*'))
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/user', require('./routes/user.js'));
app.use('/api/shelf', require('./routes/shelf.js'));
app.use('/api/chat', require('./routes/chat.js').router);
app.use('/api/socket', require('./routes/socket.js'));

