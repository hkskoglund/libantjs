var WebSocketServer = require('ws').Server;
if (typeof WebSocketServer === "undefined") {
    console.error(Date.now() + " Failed to load websocket module - ws");
}

function WebSocketManager(host, port) {

    this.host = host || "localhost";
    if (!port)
        throw new Error("Websocket port must be specified");
    this.port = port;
  
    // Client tracking keeps track of websocket server clients in "clients" property -> removed on 'close'
    this.wss = new WebSocketServer({ host: this.host, port: this.port, clientTracking: true });

    this.wss.on('listening', function () {
        console.log(Date.now(),"WebSocketServer: listening on " + this.host + ":" + this.port + " for clients");
    }.bind(this));

    this.wss.on('connection', function (ws) {
        console.log(Date.now(), "WebSocketServer: New client connected - will receive broadcast data at " + ws.upgradeReq.headers.origin, ws.upgradeReq.url);
        // console.log(ws);
        //self.websockets.push(ws); // Keeps track of all incoming websocket clients

     this.on('message', function (message) {
            console.log(Date.now(),'WebSocketServer received: %s', message);
            //    ws.send('something');
        });
    });

    this.wss.on('error', function (error) {
        console.log(Date.now(),"WebSocketServer: Error ", error);
    });

    this.wss.on('close', function (args) {
        console.log(Date.now(), "WebSocketServer: Closed", args);
    });
    
}

// Broadcast data to all clients
WebSocketManager.prototype.broadcast = function (data) {
    if (!this.wss || !this.wss.clients)
        return;

    var len = this.wss.clients.length;
    //console.log("Length of clients", len);
    for (var clientNr = 0; clientNr < len; clientNr++) {
        if (typeof this.wss.clients !== "undefined" && this.wss.clients[clientNr] !== "undefined") // Just to make sure we have clientTracking and client is present
        {
            //console.log("Sending data to client nr. ", clientNr, "data:",data);
            //console.log(self.wss.clients[clientNr]);
            this.wss.clients[clientNr].send(data);
        } else
            console.warn("Found no clients to send data to, is websocket server operative?");
    }
};

WebSocketManager.prototype.close = function () {
    if (this.wss)
      this.wss.close();
}

module.exports = WebSocketManager;