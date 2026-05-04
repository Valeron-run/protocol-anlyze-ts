import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { jsonSerialize } from './serializers/jsonSerialize.js';
import { binarySerializer } from './serializers/binarySerializer.js';
import { tcpProtocol } from './protocols/tcpProtocol.js';
import { udpProtocol } from './protocols/udpProtocol.js';
import type { serializerClient } from './serializers/serializerClient.js';
import type { transportClient } from './protocols/transportClient.js';

async function client(): Promise<void>{
    const rl = readline.createInterface({input, output});
    try{
        console.log(menu());
        while(true){
            const command: string = await rl.question("\nВыбери пункт в меню: ");
            switch(command.toLowerCase()){
                case "1": 
                case "выбрать протокол":
                    //console.log(chooseProtocol());
                    await shipment(rl);
                    break;
                case "2": 
                case "cправка протоколов":
                    referenceProtocol();
                    break;
                case "3": 
                case "повторно вывести меню":
                    console.log(menu());
                    break;
                case "4": 
                case "отправить сообщение разом всеми протоколами(анилиз)":
                    const message: string = await rl.question("\nВыбери сообщение: ");
                    await analyze(message);
                    break
                case "5":
                case "exit":
                    console.log("Завершение работы...");
                    rl.close();
                    return;
                default:
                    console.log("Ввод несуществующего действия, попробуйте еще раз");
            }
        } 
    } catch(err){
        console.error("Client error: ", err);
    } finally {
        rl.close();
    }
}

//Реализация отправки сообщения пользователям (мессенджер)
async function shipment(rl: readline.Interface): Promise<void> {
    //Выбор протокола
    const commandForProtocol: string = await rl.question("Выбери метод отправки (TCP/UDP): \n"
                                               + "1) TCP\n"
                                               + "2) UDP\n");
    //Возможно понадобиться обьект - маппер
    //Тернальный оператор - в случае если будет не выбрана цифра или они будет другая, автоматически упадет выбор на UDP протокол
    const protocol: transportClient = (commandForProtocol.toLowerCase() === "tcp" || commandForProtocol === "1") ? new tcpProtocol() : new udpProtocol()
    
    //Выбор сериализатора
    const commandForSerialize: string = await rl.question("Выбери метод отправки (JSON/Binary): \n"
                                               + "1) JSON\n"
                                               + "2) Binary\n");
    //Тернальный оператор - в случае если не будет выбрана цифра, автоматически выбереться бинарный протокол
    const serialize: serializerClient = (commandForSerialize.toLowerCase() === "json" || commandForSerialize === "1") ? new jsonSerialize() : new binarySerializer();
    
    try{
        await protocol.connect().then(() => {
            console.log(">>>[Client] Успешное подключение к серверу");
        });
        console.log(`>>>[Client] Используется протокол ${protocol.protocolName}`);  
        console.log(`>>>[Client] Используется сериализатор ${serialize.serializeName}`); 
        
        //Постоянно слушаем сервер
        protocol.onMessage(async (bufferFromBuffer: Buffer) => {
            try{
                //Десериализируем ответ от сервера
                const message: string = await onMessageReceived(bufferFromBuffer);
                if(message.length !== 0 || message !== ""){
                    console.log(`\n[Server]: ${message}`);
                }
            } catch(err){
                console.error("[Client error] Не удалось разобрать ответы от сервера");
            }
        });

        while(true){
            const message: string = await rl.question("Введите сообщение(или exit для выхода из программы): ");

            //Если клиент выбрал выход, закрываем соединение - выходим
            if(message.toLowerCase() === "exit"){ 
                protocol.close();
                break; 
            }

            const bufferMessage: Buffer = await serialize.serialize(message); //Упаковываем данные в буфер

            await protocol.send(bufferMessage); //Отправляем готовый байтовый массив в сокет

            console.log(">>> Пакет отправлен");
        }
    } catch(err: any){
        throw new Error(`>>>[Client] соединение ${protocol.protocolName} завершено ${err.message}`);
    }
}

//Реализация отпраки одного сообщения всеми методами разом
async function analyze(data: string): Promise<void>{
    const protocolTCP: transportClient = new tcpProtocol();
    const protocolUDP: transportClient = new udpProtocol();
    const serializeJSON: serializerClient = new jsonSerialize();
    const serializeBinary: serializerClient = new binarySerializer();

    //Подготовка данных(сериализируем данные для отправки по протоколу)
    const [jsonPayload, binaryPayload] = await Promise.all([
        serializeJSON.serialize(data),
        serializeBinary.serialize(data),
    ]);

    //Вспомогательная функция ( для реализации одновременного подключения и прослушивания серверов)
    const setupProtocol = async(proto: transportClient) => {
        await proto.connect();
        console.log(`>>>[Client] Успешное подключение к ${proto.protocolName} серверу`);

        proto.onMessage(async (bufferFromBuffer: Buffer) => {
            try{
                const message: string = await onMessageReceived(bufferFromBuffer);
                if(message.length !== 0 || message !== ""){
                    console.log(`\n[Server  ${proto.protocolName}]: ${message}`);
                }
            } catch (err){
                console.error(">>>[Client error] Не удалось разобрать ответы от сервера");
            }
        });
    }
    //Вспомогальная функция для подсчета времени
    const measureFullRoundTrip = async (proto: transportClient, buffer: Buffer, label: string) => {
        return new Promise<{ label: string, time: number }>((resolve) => {
            const start = performance.now();

            // 1. Устанавливаем временный обработчик ответа специально для замера
            proto.onMessage(function handler(response: Buffer) {
                const end = performance.now();
            
                // Нам нужен только первый ответ для замера, поэтому можно либо 
                // почистить слушатель, либо просто резолвить
                resolve({ label, time: end - start });
            });

            // 2. Отправляем данные
            proto.send(buffer).catch(err => {
                console.error(`Ошибка при замере ${label}:`, err);
                });
        });
    };


    const runAnalisis = async (jsonBuffer: Buffer, binBuffer: Buffer) => {
        try{
            const iterations = 10;
            const stats = {
                "TCP + JSON": 0,
                "TCP + Binary": 0,
                "UDP + JSON": 0,
                "UDP + Binary": 0
            };

            console.log(`>>>[Client Anlyze] Запуск теста: ${iterations} итераций...`);

            for (let i = 0; i < iterations; i++) {
                const results = [
                    await measureFullRoundTrip(protocolTCP, jsonBuffer, "TCP + JSON"),
                    await measureFullRoundTrip(protocolTCP, binBuffer, "TCP + Binary"),
                    await measureFullRoundTrip(protocolUDP, jsonBuffer, "UDP + JSON"),
                    await measureFullRoundTrip(protocolUDP, binBuffer, "UDP + Binary")
                ];
        
                results.forEach(res => {
                    stats[res.label as keyof typeof stats] += res.time;
                });
            }

            // Считаем среднее
            const finalTable = Object.entries(stats).map(([label, totalTime]) => ({
                label,
                averageTime: (totalTime / iterations).toFixed(4) + " мс"
            }));

            console.table(finalTable); 
        }catch(err){
            console.error("Ошибка при массовой отправке:", err);
        }
    } 

    
    try{
        //Ожидаем подключения к серверу
        await Promise.all([
            setupProtocol(protocolTCP),
            setupProtocol(protocolUDP),
        ]);

        await runAnalisis(jsonPayload, binaryPayload);
        console.log("Ждем ответы от серверов...");
        await new Promise(resolve => setTimeout(resolve, 3000)); 
    } catch(err){
        console.error(">>>[Client error] Критическая ошибка анализа:", err);
    } finally {
        setTimeout(() => {
            protocolTCP.close();
            protocolUDP.close();
        }, 5000)
    }
    
}

function menu(): string{
    return ("---Доступные команды---\n" +
            "1)Выбрать протокол\n" +
            "2)Справка протоколов\n" +
            "3)Повторно вывести меню\n" +
            "4)Отправить сообщение разом всеми протоколами(анилиз)\n" +
            "4)Exit\n");
}
function chooseProtocol(): string{
    return ("---Доступные протоколы---\n" +
            "1)TCP\n" +
            "2)UDP\n" +
            "3)TCP + gRPC\n" +
            "4)QUIC\n" +
            "5)VTP\n");
}
function referenceProtocol(): void {
    console.log("=== Справка по протоколам ===");
    console.table([
        { Протокол: "TCP", Надежность: "Высокая", Скорость: "Средняя", Особенности: "Гарантирует порядок" },
        { Протокол: "UDP", Надежность: "Низкая", Скорость: "Максимальная", Особенности: "Нет задержек" },
        { Протокол: "gRPC", Надежность: "Высокая", Скорость: "Высокая", Особенности: "Бинарное сжатие (HTTP/2)" },
        { Протокол: "QUIC", Надежность: "Высокая", Скорость: "Высокая", Особенности: "Устойчив к смене сети (UDP-based)" },
    ]);
}
//Функция для определенния формата передаваемых данных(Бинарные/JSON)
async function onMessageReceived(fullBufer: Buffer): Promise<string>{
    if(fullBufer.length === 0){ return "" ;}//Если буфер пустой, отдаем пустое сообщение
    const format: number = fullBufer.readInt8(0);

    let result: string = "";

    try{
        if(format === 0x04){
            const serialize = new jsonSerialize();
            const payload: Buffer = fullBufer.subarray(1);
            result = await serialize.deserialize(payload);
        } else if(format === 0x03){
            const serialize = new binarySerializer();
            const payload: Buffer = fullBufer.subarray(1);
            result = await serialize.deserialize(payload);
        }
    } catch (err) {
        console.error(`[Server] Ошибка десериализации: ${err}`);
    }
    

    return result;
}
client();