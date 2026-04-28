import { readSync } from "node:fs";
import type { serializerClient } from "./serializerClient.js";
import { stat, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {  mkdir } from "node:fs/promises";
import { join } from "node:path";
interface Message{
    type: "TEXT",
    text: string,
};
interface File{
    type: "FILE",
    fileName: string;
    content: string; // Тут будет Base64
    size: number;
};

export class jsonSerialize implements serializerClient{
    readonly serializeName = "json";
  
    async parseDataToJson(input: string):Promise<string>{
        try{
            const stats = await stat(input).catch(() => null);
            if(stats && stats.isFile()){
                const buffer = await readFile(input);

                //Реализация JSON File
                const file: File = {
                    type: "FILE",
                    fileName: path.basename(input),
                    content: buffer.toString("base64"),
                    size: stats.size
                }
                return JSON.stringify(file);
            }
        } catch(err: any) {
            throw new Error(`[JSON] Ошибка при чтении данных:${err.message}`);
        }
        const text: Message = {
            type: "TEXT",
            text: input,
        }
        return JSON.stringify(text);
    }


    //
    async serialize(data: string): Promise<Buffer> {
        try{
            //Формируем JSON строку
            const stringJson = await this.parseDataToJson(data);

            //Превращаем JSON в байты
            const buffer = Buffer.from(stringJson, "utf-8");
            const bufferLen = buffer.length;

            //Создаем буфер заголовка(4 байта на хранение длинны)
            const headerBuffer = Buffer.alloc(4);
            headerBuffer.writeInt32BE(bufferLen, 0);

            //Возвращаем склеенные буферные данные(4байт заголовок + н байт полезная нагрузка)
            return Buffer.concat([headerBuffer, buffer]);
        } catch(err){
            throw new Error(`[JSONser] Ошибка при сохранении файла: ${err}`);
        }
    }  
    
    async deserialize(buffer: Buffer): Promise<any> {
        //Вычисляем длинну JSON файла(Первые 4 байта)
        const jsonLen: number = buffer.readInt32BE(0);
        //Вырезаем из буфера ровно столько байтов, сколько указано в длине
        // Начинаем с 4-го байта (пропускаем заголовок)
        const jsonInput = buffer.subarray(4, 4 + jsonLen);
        //Строчный формат json
        const jsonString: string = jsonInput.toString("utf-8");
        //Парсим строку в json
        const jsonObject = JSON.parse(jsonString);

        if(jsonObject.type === "FILE"){
            return await this.saveFile(jsonObject);//Работа с файлом
        } else if(jsonObject.type === "TEXT"){
            return jsonObject.text;
        }
    }

    async saveFile(payload: File): Promise<string>{
        const dowloadDir: string = "./download";
        try{
            //Разбиваем JSON на имя файла и буфер файла 
            const fileName: string = payload.fileName;
            const fileBuffer: Buffer = Buffer.from(payload.content, "base64");

            //Cоздаем папку если ее еще нету
            //recursive: true — создаст всю цепочку папок, если нужно
            await mkdir(dowloadDir, { recursive: true });

            const filePath: string = join(dowloadDir, fileName);

            await writeFile(filePath, fileBuffer);

            console.log(`[StorageJSON] Файл успешно сохранен: ${filePath}`);

            return filePath;
        } catch(err){
            throw new Error(`[StorageJSON] Ошибка при сохранении файла: ${err}`);
        }
    }
}