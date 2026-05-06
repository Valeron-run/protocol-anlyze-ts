import dgram from "dgram"; //Библеотека для работы с UDP
import * as net from "net"; //Библеотека работы с TCP
import { QUICServer } from "@matrixai/quic";
import type { serializerClient } from "./serializers/serializerClient.js";
import type { transportClient } from "./protocols/transportClient.js";
import { tcpProtocol } from "./protocols/tcpProtocol.js";
import { jsonSerialize } from "./serializers/jsonSerialize.js";
import { binarySerializer } from "./serializers/binarySerializer.js";
async function server(): Promise<void>{
    const portTCP: number = 8081;
    const portUDP: number = 8080;
    const host: string = "0.0.0.0";
    const protocol: transportClient = new tcpProtocol();
    // TCP - server
    const serverTCP = net.createServer((socket: net.Socket) => {
        console.log(`>>>[Server] Клиент подключился к серверу: ${socket.remoteAddress}:${socket.remotePort}`);
        socket.write(">>>[Server] Подключение...\n" +
                    ">>>[Server] Успешное подключение\n");
        //Обработка данных от клиента
        socket.on("data", async (data: Buffer) => {
            const message: string = await onMessageReceived(data);
            console.log(`>>>[Server] Получено сообщение от клиента: ${message}`);
            socket.write(data);
        });
        //Обработка закрытия соединения
        socket.on("close", () => {
            console.log(">>>[Server] Клиент отлючился")
        });
        //Обработка ошибок 
        socket.on("error", (err: Error) => {
            console.error(`>>>[Server] Ошибка сокета: ${err.message}`);
        });

    });
    
    serverTCP.listen(portTCP, host, () => console.log(">>>[Server] TCP Server on 8081"));
    
    // UDP - server
    const serverUDP = dgram.createSocket("udp4");

    serverUDP.on("message", async (msg, rinfo) => {
        const message: string = await onMessageReceived(msg);
        console.log(`>>>[Server]UDP получил: ${message} от ${rinfo.address}:${rinfo.port}`);
        // В UDP мы просто отправляем ответ обратно по адресу
        serverUDP.send("ACK", rinfo.port, rinfo.address);
    })
    serverUDP.bind(portUDP, () => console.log(">>>[Server] UDP Server on 8080"));

}
//Функция для определенния формата передаваемых данных(Бинарные/JSON)
async function onMessageReceived(fullBufer: Buffer): Promise<string>{
    if(fullBufer.length === 0){ return "" ;}//Если буфер пустой, отдаем пустое сообщение
    const format: number = fullBufer.readInt8(0);

    let result: string = "";

    try{
        if(format === 0x04){
            const serialize = new jsonSerialize();
            const payload: Buffer = fullBufer.subarray(1);
            result = await serialize.deserialize(payload);
        } else if(format === 0x03){
            const serialize = new binarySerializer();
            const payload: Buffer = fullBufer.subarray(1);
            result = await serialize.deserialize(payload);
        }
    } catch (err) {
        console.error(`>>>[Server] Ошибка десериализации: ${err}`);
    }
    

    return result;
}

server();