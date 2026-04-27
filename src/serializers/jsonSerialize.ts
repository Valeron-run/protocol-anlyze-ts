import { readSync } from "node:fs";
import type { serializerClient } from "./serializerClient.js";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";

interface Message{
    text: string,
};
interface File{
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
                    fileName: path.basename(input),
                    content: buffer.toString("base64");
                    size: stats.size
                }
                return JSON.stringify(file);
            }
        } catch(err: any) {
            throw new Error(`[JSON] Ошибка при чтении данных:${err.message}`);
        }
        const text: Message = {
            text: input,
        }
        return JSON.stringify(text);
    }


    //
    async serialize(data: string): Promise<Buffer> {
        
    }

}