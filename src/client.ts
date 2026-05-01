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
    const jsSerializer = new jsonSerialize();
    const binSerializer = new binarySerializer();
    const uProtocol = new udpProtocol();
    try{
        console.log(menu());
        while(true){
            const command: string = await rl.question("\nВыбери пункт в меню: ");
            switch(command.toLowerCase()){
                case "1": 
                case "выбрать протокол":
                    console.log(chooseProtocol());
                    await shipment();
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
                    const message: string = await rl.question("\nВыбери сообщение");
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
async function shipment(): Promise<void> {
    let serialize: serializerClient;
    let protocol: transportClient;
    const rl = readline.createInterface({input, output});

    //Выбор протокола
    const commandForProtocol: string = await rl.question("Выбери метод отправки (TCP/UDP): \n"
                                               + "1) TCP\n"
                                               + "2) UDP\n");
    if(commandForProtocol === "1" || commandForProtocol.toLowerCase() === "tcp"){
        protocol = new tcpProtocol();
    } else if(commandForProtocol === "2" || commandForProtocol.toLowerCase() === "udp"){
        protocol = new udpProtocol();
    } else {
        console.log("Неравильная команда, будет выбран TCP протокол");
        protocol = new tcpProtocol();
    }
    
    //Выбор сериализатора
    const commandForSerialize: string = await rl.question("Выбери метод отправки (JSON/Binary): \n"
                                               + "1) JSON\n"
                                               + "2) Binary\n");
    if(commandForSerialize === "1" || commandForSerialize.toLowerCase() === "json"){
        serialize = new jsonSerialize();
    } else if(commandForSerialize === "2" || commandForSerialize.toLowerCase() === "binary"){
        serialize = new binarySerializer();
    } else {
        console.log("Неравильная команда, будет выбран бинарный сериализатор");
        serialize = new binarySerializer();
    }
    try{
        await protocol.connect();
        console.log(`[Клиент] Используется протокол ${protocol.protocolName}`);  
        console.log(`[Клиент] Используется сериализатор ${serialize.serializeName}`); 
        
        //Постоянно слушаем клиента
        protocol.onMessage(async (bufferFromBuffer: Buffer) => {
            try{
                //Десериализируем ответ от сервера
                const decodedResponce = await serialize.deserialize(bufferFromBuffer);
                console.log(`\n[Сервер прислал ответ]:`, decodedResponce);
            } catch(err){
                console.error("[Ошибка принятия сообщения] Не удалось разобрать ответы от сервера");
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
        throw new Error(`[Клиент] соединение ${protocol.protocolName} завершено ${err.message}`);
    } finally {
        rl.close();
    }
}

//Реализация отпраки одного сообщения всеми методами разом
async function analyze(data: string): Promise<void>{

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
client();