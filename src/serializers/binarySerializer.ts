//import type { Stats } from "@matrixai/quic/native/types.js";
import type { serializerClient } from "./serializerClient.js";
import { writeFile, mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import path from "node:path";
//Использование discriminated unions(Определить тип передаваемой переменной)
type DataType = {type: "text", value: string} | { type: "file", path: string};

export class binarySerializer implements serializerClient{
    readonly serializeName = "binary";
    private FORMAT_BIN: number = 0x03;
    //Проверка типа передаваемого сообщения
    private async searchDataType(input: string): Promise<DataType> {
        if(await this.isFilePath(input)){
            return { type: "file", path: input};
        } else {
            return {type: "text", value: input};
        } 
    }

    //Сериализация сообщения - парсим тип передаваемого сообщения, далее создаем метаданные и возвращаем передаваемый обьект
    async serialize(data: string): Promise<Buffer> {
        const dataInfo = await this.searchDataType(data);

        switch(dataInfo.type){
            case "file":
                const fileName: string = path.basename(data);
                const fileBuffer: Buffer = await readFile(data);
                return this.parseMetaData(fileBuffer, "file", fileName);
            case "text":
                const textBuffer = Buffer.from(data, "utf-8");
                return this.parseMetaData(textBuffer, "text", "");
            default:
                throw new Error(">>>[Deserializer] Ошибка при сериализации");
        }
    }

    //Метод десиарилизации данных(возврата в изначальное состояние)
    async deserialize(buffer: Buffer): Promise<string> {
        //Переменная для вычиления читаемых бит
        let offset: number = 0; 
        //Читаем первый бит данных(Тип сообщения)
        const bufferType: number = buffer.readUInt8(offset);
        offset++;
        //Читаем второй бит данных(Длинна названия файла, если он есть)
        const bufferNameFileLength: number = buffer.readUInt8(offset);
        offset++;
        //Читаем имя файла(если он есть)
        const bufferNameFile = buffer.subarray(offset, offset + bufferNameFileLength);
        //Превращаем байты имени в строку
        const fileName: string = bufferNameFile.toString("utf-8");
        offset += bufferNameFileLength;
        //Длина основного сообщения (4 байта)
        const bufferLength: number = buffer.readUInt32BE(offset);
        offset+=4;
        //Читаем само сообщение
        const inputData = buffer.subarray(offset, offset + bufferLength);

        switch(bufferType){
            //Собираем данные для файла
            case 0x01:
                console.log(">>>[Deserializer] Обнаружен файл.");
                await this.saveFile(inputData, fileName);
                return `File saved to ./download/${fileName}`;
            //Собираем данные для строки
            case 0x02:
                console.log(">>>[Deserializer] Обнаружен текст.");
                return inputData.toString("utf-8");
            default:
                throw new Error(">>>[Deserializer] Ошибка при десериализации");
        }
    }

    //Пакует сообещния в метаданные
    //Формат:
    // [1 байт] - формат данных(бинарные/ джинсон)
    // [1 байт] - тип сообщения, 
    // [1 байт] - длина имени, 
    // [n байт] - имя файла, 
    // [n байт] - само сообщение
    async parseMetaData(data: Buffer, type: "file" | "text", fileName: string = ""): Promise<Buffer>{
        //Длинна самого сообщения
        const dataLength: number = data.length;
        
        //Создаем буфер названия файла(если он есть)
        const fileNameBuffer: Buffer = Buffer.from(fileName, "utf-8");
        const fileNameLength: number = fileNameBuffer.length;

        //Создаем буфер заголовка:
        const header = Buffer.alloc(1 + 1 + 1 + fileNameLength + 4);

        let offset: number = 0;

        //Записываем формат данных
        header.writeInt8(this.FORMAT_BIN, 0);
        offset++;
        //Записываем тип
        header.writeUInt8(type === "file" ? 0x01 : 0x02, offset);
        offset++;
        //Записываем длинну имени
        header.writeUInt8(fileNameLength, offset);
        offset++;
        // Записываем само имя (копируем nameBuffer в header)
        fileNameBuffer.copy(header, offset)
        offset += fileNameLength;
        // Записываем длину основного контента (4 байта)
        header.writeUInt32BE(dataLength, offset);

        return Buffer.concat([header, data]);

    }
    //Функция создания директории и сохранения файла в исходном формате
    async saveFile(payload: Buffer, fileName: string): Promise<void>{
        const dowloadDir: string = "./download";

        try{
            //Cоздаем папку если ее еще нету
            //recursive: true — создаст всю цепочку папок, если нужно
            await mkdir(dowloadDir, { recursive: true });

            //Генерируем путь 
            const filePath: string = join(dowloadDir, fileName);

            //Записываем буфер на диск
            await writeFile(filePath, payload);

            console.log(`>>>[StorageBin] Файл успешно сохранен: ${filePath}`);
        } catch(err){
            throw new Error(`>>>[StorageBin] Ошибка при сохранении файла: ${err}`);
        }
    }
    async isFilePath(str: string): Promise<boolean> {
        // Простая проверка на наличие слэшей или расширения файла
        const hasDirectory = str.includes('/') || str.includes('\\');
        const hasExtension = /\.[0-9a-z]{1,5}$/i.test(str);
  
        // Путь часто начинается с ./ или ../
        const isRelative = /^\.\.?\//.test(str);

        return hasDirectory || hasExtension || isRelative;
    }
}
