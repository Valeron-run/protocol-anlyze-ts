import type { transportClient } from "./transportClient.js";
import dgram from "node:dgram"; //Библеотека для работы с UDP протоколом

export class udpProtocol implements transportClient{
    //Параметры UDP
    readonly protocolName = "UDP";
    private host: string; 
    private port: number;
    private client = dgram.createSocket("udp4");
    private handler?: (data: Buffer) => void;

    //Конструктор без параметов(default)/ И конструктор с параметрами(можно изменить, если клиенту понадобиться определенная отправка) 
    constructor(port: number = 8080, host: string = "localhost"){
        this.host = host;
        this.port = port;

        this.client.on("message", (msg, rinfo) => {
            if(this.handler) this.handler(msg);
        });
    }

    //Оставляем реализацию метода пустым, так как соединение с сервером нам не нужно
    async connect():Promise<void>{
    };
    
    //Реализация метода send Интерфейса transportClient
    async send(data: Buffer): Promise<void>{
        console.log(`[UDP] Отправка ${data.length} байт на ${this.port}:${this.host}...`);
        return new Promise((resolve, reject) => {
            this.client.send(data, this.port, this.host, (err) => {
                if(err) return reject(err);
                console.log("Пакет отправлен");
                resolve();
            })
        })
    }

    //Callback метод принятия сообщения от сервера
    onMessage(handler: (data: Buffer) => void): void {
        this.handler = handler;
    }

    //Реализация метода закрытия порта
    async close(): Promise<void> {
        this.client.close(); //Закрытие порта
        console.log("[UDP] порт закрыт");
    } 
}