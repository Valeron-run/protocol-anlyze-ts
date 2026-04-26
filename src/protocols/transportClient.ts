
//Контракт для вех траспортных протоколов
export interface transportClient{  
    readonly protocolName: string;
    //Метод соединения с сервером
    connect(): Promise<void>;

    //Метод отправки - принимает Buffer
    //Возвращает promise так как отправка асинхронная операция
    send(data: Buffer): Promise<void>;

    //Метод для закрытия соединения
    close(): Promise<void>;
}