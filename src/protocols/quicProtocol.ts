import type { transportClient } from "./transportClient.js";
import quic from "node:quic";
import { readFileSync } from "node:fs";

export class quicProtocol implements transportClient{
    readonly protocolName = "QUIC";
    private client: QUICClient | null = null;
    private socket: QUICSocket | null = null; 
    private stream: any = null;
    private host: string;
    private port: number;
    private alpn = "foo";
    //Динамический конструктор quicProtocol(изначально порты и хост задан, есть возможность менять)
    constructor(port: number = 9090, host:string = "localhost"){
        this.host = host;
        this.port = port;
    }

    //Подключение
    async connect(): Promise<void> {
        try{
            //С начало создаем сокет
            this.socket = new QUICSocket();
            await this.socket.start();

            //Создаем клиента
            this.client = await QUICClient.createQUICClient({
                host: this.host,
                port: this.port,
                socket: this.socket,
            });

            this.stream = await this.client.connection.newStream();

            
            console.log(`[QUIC] Соединение и поток открыты на ${this.host}:${this.port}`);
        } catch(err){
            console.error("[QUIC] Ошибка при чтении сертификатов или подключении: ", err);
            throw err;
        } 
    }

    async send(data: Buffer): Promise<void>{
        if(!this.client){
            throw new Error("[QUIC] сокет закрыт. С начало вызовете connect()");
        }

        
        // Обычно это WritableStream
        const writer = this.stream.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        console.log(`[QUIC] Отправлено ${data.length} байт`);
    }

    async close(): Promise<void> {
        if(this.stream) await this.stream.destroy();
        if(this.client) await this.client.stop();
        console.log("[QUIC] Соединение закрыто");
    }

}