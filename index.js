/* ==== IMPORTS ============================================================== */
const express = require('express')
const bodyParser = require('body-parser')

const https = require('https');
const http = require('http');

const { networkInterfaces } = require('os');

const RESET_COLOR = "\x1b[0m";

/* ==== SETUP ================================================================ */
const jsonParser = bodyParser.json()
const app = express();

/* ==== FORWARDER ============================================================ */
app.use('/', jsonParser, (clientRequest, clientResponse) => {

    // Forward headers, but remove some values
    const { url, host, ...headers } = clientRequest.headers;
    delete headers["content-length"];
    delete headers["url"];
    delete headers["host"];

    // Get the hostname from the url retrieved
    const parsedHost = url.split('/').splice(2).splice(0, 1).join('/')

    // Create the options parameters given to the http(s) module for the request
    const options = {
        hostname: parsedHost,
        path: clientRequest.url,
        method: clientRequest.method,
        headers
    };

    var protocol;
    if (url.startsWith('https://')) {
        options.port = 443
        protocol = https
    } else if (url.startsWith('http://')) {
        options.port = 80
        protocol = http
    }

    // Log received request
    // console.log(`[\x1b[90m${new Date().toLocaleTimeString()}${RESET_COLOR}] Request received: \x1b[35m${clientRequest.method}${RESET_COLOR} \x1b[33m${parsedHost}${clientRequest.url}${RESET_COLOR} from \x1b[33m${clientRequest.hostname}${RESET_COLOR} - Body: ${JSON.stringify(clientRequest.body)} - Headers: ${JSON.stringify(clientRequest.headers)}`);
    console.log(`Request received: ${clientRequest.method} ${parsedHost}${clientRequest.url} from ${host} - Body: ${JSON.stringify(clientRequest.body)} - Headers: ${JSON.stringify(clientRequest.headers)}`);

    // Actual request made by the server with the received data
    const serverRequest = protocol.request(options, function (serverResponse) {
        var body = '';
        if (String(serverResponse.headers['content-type']).indexOf('text/html') !== -1) {
            serverResponse.on('data', function (chunk) {
                body += chunk;
            });

            serverResponse.on('end', function () {
                // Make changes to HTML files when they're done being read.
                // body = body.replace(`example`, `Cat!` );

                // Forward status code and headers
                clientResponse.writeHead(serverResponse.statusCode, serverResponse.headers);
                clientResponse.end(body);
            });
        } else {
            // Forward status code and headers
            clientResponse.writeHead(serverResponse.statusCode, serverResponse.headers);
            serverResponse.pipe(clientResponse, { end: true });
            
            // clientResponse.contentType(serverResponse.headers['content-type'])
        }
    });

    // POSTS, ecc: forward body
    if(clientRequest.body) serverRequest.write(JSON.stringify(clientRequest.body));
    serverRequest.end();
});


/* ==== START SERVER ========================================================= */
// Get IP address of the machine
const getAddress = () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets))
        for (const net of nets[name])
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) return net.address;
}

const PORT = process.env.PORT || 80;
app.listen(PORT)
console.log(`Server started and listening on ${getAddress()}:${PORT}`);