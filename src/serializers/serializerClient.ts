// Контракт для всех сериалайзеров
export interface serializerClient{
    readonly serializeName: string;

    //Метод перевода строки в байт код/ json формат
    serialize(data: any): Promise<Buffer>;

    //Метод для де-сериализации(обратного перевода строки в исходный вид)
    deserialize(buffer: Buffer): Promise<any>;
}