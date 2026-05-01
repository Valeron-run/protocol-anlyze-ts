import dgram from "dgram";
import * as net from "net";
import type { serialiazerCilent } from "src/serializers/serializerClient.ts";
async function server(): Promise<void>{
    const portTCP: number = 8081;
    const portUDP: number = 8080;
    const host: string = "localhost";
    // TCP - server
    const serverTCP = net.createServer((socket: net.Socket) => {
        console.log(`Клиент подключился к серверу: ${socket.remoteAddress}:${socket.remotePort}`);

        socket.on("data", (data: Buffer) => {
            console.log("Получено сообщение");
            
        })

    })
    
    serverTCP.listen(portTCP, host, () => console.log("TCP Server on 8081"));
    
    // UDP - server
    const serverUDP = dgram.createSocket("udp4");

    serverUDP.on("message", (msg, rinfo) => {
        console.log(`UDP получил: ${msg} от ${rinfo.address}:${rinfo.port}`);
        // В UDP мы просто отправляем ответ обратно по адресу
        serverUDP.send("ACK", rinfo.port, rinfo.address);
    })
    serverUDP.bind(portUDP, () => console.log("UDP Server on 8080"));
}