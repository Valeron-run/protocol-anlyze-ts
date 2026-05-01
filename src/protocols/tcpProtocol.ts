import type { transportClient } from "./transportClient.js"; 
import * as net from "net";
import type { serializerClient } from "../serializers/serializerClient.js";
import { serialize } from "v8";
export class tcpProtocol implements transportClient{
    readonly protocolName = "TCP";
    private host: string;
    private port: number;
    private client = new net.Socket();
    private handler?: (data: Buffer) => void;

    //Изменяемый конструктор класса(Изначально задан в случае чего, можно изменить на свои параметры)
    constructor(port: number = 8081, host: string = "localhost"){
        this.host = host;
        this.port = port;

        this.client.on("data", (data: Buffer) => {
            if (this.handler) this.handler(data);
        });
    }

    //Создание соединения с севером
    async connect(): Promise<void>{

        return new Promise((resolve, reject) => {

            //Если подключение уже было до этого установлено, ничего не делаем
            if(!this.client.destroyed && this.client.readable){
                return resolve();
            }

            //реализация подключения к серверу(handshake)
            this.client.connect(this.port, this.host, () => {
                console.log(`[TCP] Установлено соединение с ${this.host}:${this.port}`);
                resolve();
            });

            this.client.once("error", (err) => reject(err));
        });
    }

    //Реализация метода Интерфейса transportClient
    async send(data: Buffer): Promise<void | undefined>{
        if(this.client.destroyed){
            throw new Error("[TCP] сокет закрыт. С начало вызовете connect()");
        }

        return new Promise((resolve, reject) => {
            this.client.write(data, (err) => {
                if (err) return reject(err);
                console.log(`[TCP] Данные (${data.length} байт) переданы в буфер отправки`);
                resolve();
            })
        })
    }

    //Callback метод принятия сообщения от сервера
    onMessage(handler: (data : Buffer) => void): void {
        this.handler = handler;
    }


    //Закрытие соединения протокола TCP
    async close(): Promise<void> {
        return new Promise((resolve) => {
            console.log("[TCP] Инициировано закрытие соединения...");
            this.client.end(() => {
                console.log("[TCP] Соединение полностью разорвано");
                resolve();
            });
        });
    }
}