import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';


async function client(): Promise<void>{
    const rl = readline.createInterface({input, output});
    try{
        console.log(menu());
        while(true){
            const command = await rl.question("\nВыбери пункт в меню: ");

            switch(command.toLowerCase()){
                case "1": 
                case "выбрать протокол":
                    console.log(chooseProtocol());
                    //Вызов выбора и уже переход по протоколам
                    break;
                case "2": 
                case "cправка протоколов":
                    console.log(chooseProtocol());
                    break;
                case "3": 
                case "повторно вывести меню":
                    console.log(menu());
                    break;
                case "4": 
                case "exit":
                    console.log("Завершение работы...");
                    rl.close();
                    return;
                default:
                    console.log("Ввод несуществующего действия, попробуйте еще раз");
            }
        } 
    } catch(error){
        console.error("Client error: ", error);
    } finally {
        rl.close();
    }
}

function menu(): string{
    return ("---Доступные команды---\n" +
            "1)Выбрать протокол\n" +
            "2)Справка протоколов\n" +
            "3)Повторно вывести меню\n" +
            "4)Exit");
}
function chooseProtocol(): string{
    return ("---Доступные протоколы---\n" +
            "1)TCP\n" +
            "2)UDP\n" +
            "3)TCP + gRPC\n" +
            "4)QUIC\n" +
            "5)VTP\n");
}

client();