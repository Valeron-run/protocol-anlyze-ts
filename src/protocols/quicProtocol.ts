import type { transportClient } from "./transportClient.js";
import { QUICClient, createQuicConfig } from "@matrixai/quic";
import { readFileSync } from "node:fs";

export class quicProtocol implements transportClient{
    readonly protocolName = "QUIC";
    private client: QUICClient | null = null;
    private stream: any = null 
    private host: string;
    private port: number;

    //Динамический конструктор quicProtocol(изначально порты и хост задан, есть возможность менять)
    constructor(port: number = 9090, host:string = "localhost"){
        this.host = host;
        this.port = port;
    }

    //Подключение
    async connect(): Promise<void> {
        if(this.client?.started) return;
        
        //Создаем конфиг
        const config = createQuicConfig({
            ca: readFileSync("ca.crt"),
        });

        this.client = new QUICClient({
            config,
            host: this.host,
            port: this.port
        });

        await this.client.start();

        this.stream = await this.client.createStream();
        console.log(`[QUIC] Соединение и поток открыты на ${this.host}:${this.port}`);
    }

    async send(data: Buffer): Promise<void>{
        if(!this.client){
            throw new Error("[QUIC] сокет закрыт. С начало вызовете connect()");
        }

        
        this.stream.write(data);
        console.log(`[QUIC] Отправлено ${data.length} байт`);
    }

    async close(): Promise<void> {
        if(this.stream) await this.stream.destroy();
        if(this.client) await this.client.stop();
        console.log("[QUIC] Соединение закрыто");
    }

}