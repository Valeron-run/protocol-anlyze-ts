import http from 'http';
import dgram from "dgram";
async function server(): Promise<void>{

    // TCP - server
    const serverTCP = http.createServer((res, req) => {
        res.end("Hello from TCP/HTTP");
    });
    serverTCP.listen(8081, () => console.log("TCP Server on 8081"));
    
    // UDP - server
    const serverUDP = dgram.createSocket("udp4");

    serverUDP.on("message", (msg, rinfo) => {
        console.log(`UDP получил: ${msg} от ${rinfo.address}:${rinfo.port}`);
        // В UDP мы просто отправляем ответ обратно по адресу
        serverUDP.send("ACK", rinfo.port, rinfo.address);
    })
    serverUDP.bind(8080, () => console.log("UDP Server on 8080"));
}