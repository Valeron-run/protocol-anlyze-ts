import type { transportClient } from "./transportClient.js"; 
import * as net from "net";
import type { serializerClient } from "../serializers/serializerClient.js";
import { serialize } from "v8";
export class tcpProtocol implements transportClient{
    readonly protocolName = "TCP";
    private host: string;
    private port: number;
    private client: net.Socket;
    private handler?: (data: Buffer) => void;
    private TCP_PORT: number = 8081;

    //Изменяемый конструктор класса(Изначально задан в случае чего, можно изменить на свои параметры)
    constructor(port: number = this.TCP_PORT, host: string = "localhost"){
        this.host = host;
        this.port = port;
        this.client = new net.Socket();
        this.setupListeners();
    }
    private setupListeners(): void {
        // Удаляем старые слушатели, если они были, чтобы не плодить дубликаты
        this.client.removeAllListeners("data");
        this.client.removeAllListeners("error");
        this.client.removeAllListeners("close");
        this.client.removeAllListeners("end");   

        this.client.on("data", (data: Buffer) => {
            if (this.handler) this.handler(data);
        });

        this.client.on("close", (hadError) => {
            console.log(`>>>[TCP] Соединение полностью закрыто. Ошибка: ${hadError}`);
        });
        this.client.on("end", () => {
            console.log(">>>[TCP] Сервер разорвал соединение");
            this.client.destroy(); // Важно! Помечаем сокет как уничтоженный
        });

        this.client.on("error", (err) => {
            // Если случилась ошибка, сокет обычно закрывается. 
            // Просто логируем, чтобы клиент не падал без обработки.
            console.error(`>>>[TCP Socket Error]: ${err.message}`);
        });
    }
    //Создание соединения с севером
    async connect(): Promise<void> {
    console.log(`>>>[TCP] Подготовка к подключению на ${this.host}:${this.port}...`);

    return new Promise((resolve, reject) => {
        // Устанавливаем аварийный таймер на 5 секунд
        const timeout = setTimeout(() => {
            console.error(">>>[TCP] Превышено время ожидания подключения (Timeout)");
            this.client.destroy();
            reject(new Error(">>>[TCP] Connection timeout"));
        }, 5000);

        if (this.client.writable && !this.client.destroyed && this.client.localPort) {
            console.log(">>>[TCP] Повторное использование активного соединения");
            clearTimeout(timeout);
            return resolve();
        };

        if (this.client.destroyed) {
            console.log(">>>[TCP] Создание нового сокета (предыдущий был уничтожен)");
            this.client = new net.Socket();
            this.setupListeners();
        };
        
        this.client.connect(this.port, this.host, () => {
            clearTimeout(timeout); 
            resolve();
        });

        this.client.once("error", (err) => {
            clearTimeout(timeout); // Убираем таймер при ошибке
            console.error(">>>[TCP] Событие 'error' сработало:", err.message);
            reject(err);
        });
    });
}

    //Реализация метода Интерфейса transportClient
    async send(data: Buffer): Promise<void | undefined>{
        if(this.client.destroyed){
            throw new Error(">>>[TCP] сокет закрыт. С начало вызовете connect()");
        }

        return new Promise((resolve, reject) => {
            this.client.write(data, (err) => {
                if (err) return reject(err);
                console.log(`>>>[TCP] Данные (${data.length} байт) переданы в буфер отправки`);
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