import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Tipos de Listeners
const listenerType = {
    /** @type {NodeJS.Timeout[]} */
    timeStart: [],
    /** @type {NodeJS.Timeout[]} */
    timeDelete: [],
    /** @type {NodeJS.Timeout[]} */
    timeEnd: [],
};

// Variáveis globais
/** @type {Map<string, number>} */
let globalMap = new Map();
/** @type {CooldownCollector} */
let globalCollector;
/** @type {Map<string, number>} */
let globalTemporaryMap;
/** @type {Object} */
let globalUpdateFileObj = {};
/** @type {boolean} */
let globalHasInTimeout;
/** @type {{user: NodeJS.Timeout}} */
const globalTimeoutList = {};
/** @type {string[]} */
const invalidString = ['\'', '\\'];
/** @type {number} */
const globalLimitTimeout = 2147483500; // <- Limite Number 32 bits do timeout
/** @type {string} */
const dir = path.resolve(__dirname, './cooldownDb.cjs');

/**
 * - Classe para gerenciar cooldown/delays de funções. 
 * 
 * @example
 * const cooldown = new Cooldown();
 */
class Cooldown {
    constructor() {
        globalCollector = new CooldownCollector();
    }

    /**
     * - Adicionar um novo cooldown em um usuário/diretório (substitui se já for existente).
     * @param {string} user String contendo o diretório ou usuário.
     * @param {Object} time Tempo para resetar o cooldown.
     * @param {number} [time.segundos] Tempo em segundos para finalizar o cooldown.
     * @param {number} [time.minutos] Tempo em minutos para finalizar o cooldown.
     * @param {number} [time.horas] Tempo em horas para finalizar o cooldown.
     * @param {number} [time.dias] Tempo em dias para finalizar o cooldown.
     * @param {boolean} time.save Deseja salvar o cooldown para continuar caso o bot reinicie?
     * 
     * @example
     * // Adicione cooldown para a string fornecida:
     * cooldown.set(user.id, { segundos: 10 }); // 10 segundos
     * cooldown.set(user.id, { minutos: 10 }); // 10 minutos
     * cooldown.set(user.id, { horas: 10 }); // 10 horas
     * cooldown.set(user.id, { dias: 10 }); // 10 dias
     * 
     * // Ative propriedade "save" se quiser que cooldown continue caso projeto reiniciar:
     * cooldown.set(user.id, { segundos: 10, save: true });
    */
    async set(user, time) {
        const save = !!time?.save;

        // Erros
        if (typeof user !== 'string') throw new CooldownError(1, 
            { received: user, required: 'String' }, 
            { function: 'set(user, time)', param: 'user' });

        if (invalidString.some(s => JSON.stringify(user).includes(s))) throw new CooldownError(3, 
            { received: user, required: invalidString }, 
            { function: 'set(user, time)', param: 'user' });

        if (typeof time !== 'object' || Array.isArray(time) || !['segundos', 'minutos', 'horas', 'dias'].some(s => time[s] !== undefined)) throw new CooldownError(1, 
            { received: time, required: 'Object { segundos | minutos | horas | dias }' }, 
            { function: 'set(user, time)', param: 'time' });

        // Ajustando tempo enviado
        let segundos, minutos, horas, dias;
        segundos = time?.segundos || 0;
        minutos = time?.minutos || 0;
        horas = time?.horas || 0;
        dias = time?.dias || 0;
        if (segundos) segundos++;

        minutos *= 60;
        horas *= 60 * 60;
        dias *= 24 * 60 * 60; 

        let seconds = parseInt(segundos + minutos + horas + dias);
        if (seconds > 315576000) seconds = 315576000; // 10 anos
        if (seconds < 0) seconds = 0;

        // Ifs de verificação
        const ms = parseInt(new Date().getTime() / 1000) + seconds;
        if (seconds === 0 && !globalTemporaryMap.size) return;
        if (globalTimeoutList[user]) clearTimeout(globalTimeoutList[user]);
        if (seconds * 1000 > globalLimitTimeout) seconds = parseInt(globalLimitTimeout / 1000);
        
        // Registrando usuário e emitindo evento "timeStart"
        globalMap.set(user, ms);
        const userTime = ms * 1000;

        if (!globalTemporaryMap.size) setTimeout(() => globalCollector.emit('timeStart', { user, time: userTime }));
        if (!globalTemporaryMap.size && !save) new CooldownDatabase(globalMap).remove(user);            
        if (save) new CooldownDatabase(globalMap).set(user);
        this.#execute(user, seconds * 1000);
    }

    /**
     * - Busca o timestamp de um cooldown existente.
     * - Busca todos os cooldowns se parâmetro for vazio.
     * @param {string} user String contendo o diretório ou usuário.
     * 
     * @example
     * cooldown.set(user.id, { segundos: 5 });
     * 
     * cooldown.get(user.id); // Retorna: 1673553680000
     * cooldown.get(); // Retorna: [ { user: '545154148069408768', time: 1673553680000 } ]
     * @additional Intellisense do VSCode pode ajudar a lidar com esses dados se for usado `typeof`.
     * 
     * @example
     * const valores = cooldown.get();
     * 
     * // JavaScript vai tratar como Array e mostrar as propriedades "user" e "time" em cada valor:
     * if (typeof valores === 'object') {
     *   console.log(valores[0].user);
     *   console.log(valores[0].time);
     * }
     * 
     * // JavaScript vai tratar como Number:
     * else {
     *   console.log(valores);
     * }
     * @returns {number|UserAndTimeObject[]} `time` ou `[{ user, time }]`
    */
    get(user = undefined) {
        // Se for buscar de todos
        if (typeof user !== 'string') {
            const action = [];
            Object.entries(Object.fromEntries(globalMap)).forEach(([key, value]) => action.push({ user: key, time: (value * 1000) }));
            return action;
        }

        // Se for buscar de um
        return (globalMap.get(user)) ? (globalMap.get(user) * 1000) : undefined;
    }

    /**
     * - Verifica se um cooldown está ativo.
     * @param {string} user String contendo o diretório ou usuário.
     * 
     * @example
     * cooldown.has(user.id); // Retorna: false
     * cooldown.set(user.id, { segundos: 5 });
     * cooldown.has(user.id); // Retorna: true
     * @returns {boolean} `true` ou `false`
    */
    has(user) {
        // Erros
        if (typeof user !== 'string') throw new CooldownError(1, 
            { received: user, required: 'String' }, 
            { function: 'has(user)', param: 'user' });

        if (invalidString.some(s => JSON.stringify(user).includes(s))) throw new CooldownError(3, 
            { received: user, required: invalidString }, 
            { function: 'has(user)', param: 'user' });

        return globalMap.has(user);
    }

    /**
     * - Mostra o texto do tempo restante para o usuário usar o comando novamente.
     * @param {string} user String contendo o diretório ou usuário.
     * @param {'timestamp'|'texto'|'digital'} type Formato do tempo: 
     * - `timestamp`: **"<t:1673553680:R>"** (timestamp date para o Discord).
     * - `texto`: **"5 segundos"**.
     * - `digital`: **"00:05"**.
     * 
     * @example
     * cooldown.set(user.id, { segundos: 5 });
     * 
     * cooldown.left(user.id, 'timestamp'); // Retorna: <t:1673553680:R>
     * cooldown.left(user.id, 'digital'); // Retorna: 00:05
     * cooldown.left(user.id, 'texto'); // Retorna: 5 segundos
     * @returns {string} `1 dos 3 formatos`
     */
    left(user, type) {
        // Erros
        if (typeof user !== 'string') throw new CooldownError(1, 
            { received: user, required: 'String' }, 
            { function: 'left(user, type)', param: 'user' });

        if (invalidString.some(s => JSON.stringify(user).includes(s))) throw new CooldownError(3, 
            { received: user, required: invalidString }, 
            { function: 'left(user, type)', param: 'user' });

        if (typeof type !== 'string' || !['timestamp', 'texto', 'digital'].some(s => s === type)) throw new CooldownError(1, 
            { received: type, required: 'String \'timestamp\' | \'texto\' | \'digital\'' }, 
            { function: 'left(user, type)', param: 'type' });

        // Se não tiver ms ou se já passou o tempo
        let ms = this.get(user);
        if (!ms || ms < new Date().getTime()) {
            if (type === 'digital') return '00:00 <';
            if (type === 'texto') return 'alguns milisegundos';
            if (type === 'timestamp') return `<t:${parseInt(new Date().getTime() / 1000)}:R>`;
        }

        // Retornando type "timestamp"
        if (type === 'timestamp') return `<t:${parseInt(ms / 1000)}:R>`;
        
        // Retornando type "digital"
        if (type === 'digital') {
            ms = ms - new Date().getTime();
            
            // Regulando tempos
            const segundos = parseInt((ms / 1000) % 60).toString().padStart(2, '0');
            const minutos = parseInt((ms / 60000) % 60).toString().padStart(2, '0');
            const horas = parseInt((ms / 3600000) % 24).toString().padStart(2, '0');
            const dias = parseInt(ms / 86400000 % 365).toString().padStart(2, '0');
            const anos = parseInt(ms / 31536000000).toString().padStart(2, '0');

            if (ms < 3600000) return `${minutos}:${segundos}`;
            else if (ms < 86400000) return `${horas}:${minutos}:${segundos}`;
            else if (ms < 31536000000) return `${dias}:${horas}:${minutos}:${segundos}`;
            else return `${anos}:${dias}:${horas}:${minutos}:${segundos}`;
        }
        
        // Retornando type "texto"
        let textTime;
        ms -= parseInt(new Date().getTime());
        ms = parseInt(ms / 1000);

        // Ajustando textos
        if (ms < 60) textTime = 'segundo'; // < 1 Minuto
        else if (ms < 3600) textTime = 'minuto'; // < 1 Hora
        else if (ms < 86400) textTime = 'hora'; // < 1 Dia
        else if (ms < 31536000) textTime = 'dia'; // < 1 ano
        else textTime = 'ano';
        
        if (textTime === 'minuto') ms = parseInt(ms /= 60);
        else if (textTime === 'hora') ms = parseInt(ms /= 3600);
        else if (textTime === 'dia') ms = parseInt(ms /= 86400);
        else if (textTime === 'ano') ms = parseInt(ms / 31536000);
        
        if (ms > 1) textTime += 's';
        if (ms <= 0) return 'alguns milisegundos';

        return `${ms} ${textTime}`;
    }

    /**
     * - Força a remoção de algum cooldown.
     * - Remove todos os cooldowns se parâmetro for vazio.
     * @param {string} user String contendo o diretório ou usuário.
     * 
     * @example
     * cooldown.set(user.id, { segundos: 5 });
     * cooldown.has(user.id); // Retorna: true
     * 
     * cooldown.remove(user.id); 
     * cooldown.has(user.id); // Retorna: false
     */
    async remove(user = undefined) {
        // Verificando se tem registros
        if (!globalMap.size) return;
        if (typeof user !== 'string') new CooldownDatabase(globalMap).remove();
        else if (globalMap.has(user)) new CooldownDatabase(globalMap).remove(user);
        else return;

        // Configurando collector
        let action = [];
        if (user) action = [{ user, time: (globalMap.get(user) * 1000) }];
        else Object.entries(Object.fromEntries(globalMap)).forEach(([key, value]) => action.push({ user: key, time: (value * 1000) }));

        setTimeout(() => globalCollector.emit('timeDelete', action));

        // Limpando timeouts: todos
        if (typeof user !== 'string') {
            Object.keys(globalTimeoutList).forEach(key => {
                clearTimeout(globalTimeoutList[key]);
                delete globalTimeoutList[key];
            });
            globalMap.clear();
        }

        // Limpando timeouts: usuário
        else {
            clearTimeout(globalTimeoutList[user]);
            delete globalTimeoutList[user];
            globalMap.delete(user);
        }
    }

    /**
     * - Executar um temporizador interno.
     * - Por ser estrutura interna, não há verificação de erros nos parâmetros.
     * @param {string} user String contendo o diretório ou usuário.
     * @param {number} miliseconds Tempo em milisegundos para acabar o  `setTimeout()`.
    */
    #execute(user, miliseconds) {
        globalTimeoutList[user] = setTimeout(async () => {
            // Verificando se deve re-executar
            if (this.get(user) && this.get(user) > new Date().getTime()) {
                let ms = this.get(user) - new Date().getTime();

                if (ms > globalLimitTimeout) ms = globalLimitTimeout;
                clearTimeout(globalTimeoutList[user]);
                delete globalTimeoutList[user];
                return this.#execute(user, ms);
            }

            globalCollector.emit('timeEnd', { user, time: (globalMap.get(user) * 1000) });

            // Deletando cooldwn
            delete globalTimeoutList[user];
            await new CooldownDatabase(globalMap).remove(user);

            globalMap.delete(user);
        }, miliseconds);
    }
};

/**
 * - Classe para receber os eventos de cooldowns.
 * 
 * @example
 * const cooldownCollector = new CooldownCollector();
 */
class CooldownCollector {
    /**
     * - Cria uma função que dispara quando um cooldown é **criado**, **finalizado** ou **deletado**. 
     * @param {ListenersName} eventName O tipo do evento a ser disparado, podendo ser:
     * - `timeStart` - Cooldown criado.
     * - `timeEnd` - Cooldown finalizado.
     * - `timeDelete` - Cooldown deletado.
     * @param {function(UserAndTimeObject|Array.<UserAndTimeObject>): void} action Seu código a ser executado quando o evento disparar.
     * - Exemplo: `(data) => seu código`
     * 
     * @example
     * cooldownCollector.on('timeStart', data => data.user);
     * cooldownCollector.on('timeEnd', data => data.user);
     * cooldownCollector.on('timeDelete', data => data[0].user);
     * 
     * @note Se for `timeDelete` é importante notar que `data` contém uma Array de cooldown deletados. 
     * Isso ocorre pois pode ser deletado todos os cooldowns de uma só vez.
     * 
     * @example
     * cooldownCollector.on('timeStart', data => console.log(data));
     * // { user, time }
     * 
     * cooldownCollector.on('timeDelete', data => console.log(data));
     * // [
     * //   { user, time },
     * //   { user, time },
     * //   { user, time },
     * // ]
     * 
     * @additional Intellisense do VSCode pode ajudar a lidar com esses dados se for usado `Array.isArray()`.
     * 
     * @example
     * cooldownCollector.on('<time>', data => {
     *   // JavaScript vai tratar como Array e mostrar as propriedades "user" e "time" em cada valor:
     *   if (Array.isArray(data)) console.log(data[0].user)
     * 
     *   // JavaScript vai tratar como um Object e mostrar as propriedades "user" e "time":
     *   else console.log(data.user);  
     * });
     */
    on(eventName, action) {
        // Erros
        if (typeof eventName !== 'string' || !listenerType[eventName]) throw new CooldownError(2, 
            { received: eventName, required: `String ${Object.keys(listenerType).map(m => `"${m}"`).join(', ')}` },
            { function: 'on(eventName, action)', param: 'eventName' });

        if (typeof action !== 'function') throw new CooldownError(2, 
            { received: action, required: `Function () => { Seu Código }` },
            { function: 'on(eventName, action)', param: 'action' });

        listenerType[eventName].push(action);
    }

    /**
     * ⚠️ *Você não precisa usar isto!*
     * - Emite um evento no tipo definido.
     * - Usado para emitir quando um evento é **criado**, **finalizado** e **deletado**.
     * @param {ListenersName} eventName O tipo do evento a ser disparado, podendo ser:
     * - `timeStart` - Cooldown criado.
     * - `timeEnd` - Cooldown finalizado.
     * - `timeDelete` - Cooldown deletado.
     * @param {UserAndTimeObject|UserAndTimeObject[]} data Os dados retornados, podendo ser:
     * - `{ user, time }` - Cooldown criado.
     * - `{ user, time }` - Cooldown finalizado.
     * - `[ { user, time } ]` - Cooldown deletado.
     */
    emit(eventName, data) {
        // Erros
        if (typeof eventName !== 'string' || !listenerType[eventName]) throw new CooldownError(2, 
            { received: eventName, required: `String ${Object.keys(listenerType).map(m => `"${m}"`).join(', ')}` },
            { function: 'emit(eventName, data)', param: 'eventName' });

        if (!listenerType[eventName]) return;
        listenerType[eventName].forEach((listener) => listener(data));
    }

    /**
     * - Busca a quantidade de um tipo de `cooldownCollector.on()` ativo.
     * - Retorna o valor de todos os tipos se parâmetro for vazio.
     * @param {ListenersName} eventName Nome do evento a ter seu valor contado. 
     * @returns {number} `number`
     */
    getListenersCount(eventName = undefined) {
        // Erros
        if (typeof eventName === 'string' && !listenerType[eventName]) throw new CooldownError(2, 
            { received: eventName, required: `String ${Object.keys(listenerType).map(m => `"${m}"`).join(', ')}` },
            { function: 'getListenersCount(eventName)', param: 'eventName' });

        if (typeof eventName !== 'string') return (Object.values(listenerType)).reduce((count, listener) => count + listener.length, 0);
        if (eventName) return listenerType[eventName].length;
    }
}

/**
 * Classe para guardar dados no banco de dados, para salvar valores ao projeto/bot reiniciar
 * 
 * @example
 * const cooldownDatabase = new CooldownDatabase();
 */
class CooldownDatabase {
    /** @param {Map<string, number>} map Busque de um `new Map()` de valores já existentes. */
    constructor(map) {
        this.map = map;
    }

    /**
     * - Registra localmente os valores de um cooldown.
     * @param {string} user String contendo o diretório ou usuário.
    */
    set(user) {
        // Ifs verificadores
        if (!user) return;
        if (!this.map.get(user) || this.map.get(user) * 1000 <= new Date().getTime()) return;
    
        // Atualizando object de dados
        globalUpdateFileObj[`${user}`] = this.map.get(user);
        this.#updateFile();
    }

    /**
     * - Busca os valores de um cooldown registrado localmente.
     * - Busca todos os cooldowns se parâmetro for vazio.
     * @param {string} user String contendo o diretório ou usuário.
     * @returns {Promise<number|{ user: time }>} `number` ou `{ [user]: [time] }`
    */
    async get(user = undefined) {
        // Ajustando dados
        const dados = await this.#tryRequire();

        // Retornando dados da database
        if (typeof user === 'string') return dados[user];
        else return dados;
    }

    /**
     * - Remove localmente os valores de um cooldown.
     * - Remove todos os cooldowns se parâmetro for vazio.
     * @param {string} user String contendo o diretório ou usuário.
    */
    async remove(user = undefined) {
        // Atualizando object de dados
        if (typeof user === 'string' && !this.map.get(user)) return;
        if (typeof user === 'string') globalUpdateFileObj[user] = null;
        else {
            globalUpdateFileObj = await this.get();
            Object.keys(globalUpdateFileObj).forEach(key => { globalUpdateFileObj[key] = null; });
        }
        this.#updateFile();
    }

    /**
     * - Deleta o cache do arquivo `cooldownDb.cjs` e faz uma nova importação.
     * - Mostra uma mensagem no console se não for possível concluir a operação.
     * @returns {Promise<{user?: time}>}
     */
    async #tryRequire() {
        try {
            if (!fs.existsSync(dir)) return {}; 
            delete require.cache[require.resolve(dir)]; 
            return require('./cooldownDb.cjs'); 
        } 
        catch (err) { 
            console.error(nodeColors().vermelho(`\n⇣ COOLDOWN ⇣ \nArquivo de dados registrados (cooldownDb.cjs) encontra-se corrompido.`) + 
                '\n➥ Foi necessário reformular o arquivo!\n\n', err);
            return {};
        }
    }

    /**
     * - Atualiza os dados enviados no arquivo local de database `cooldownDb.cjs`.
     * - A atualização é colocada em `setTimeout()` para não sobrepor dados.
     */
    #updateFile() {
        if (globalHasInTimeout) return;
        else globalHasInTimeout = true; 

        // Colocando em timeout p não dar edit's sobrecarregados
        setTimeout(async () => {
            // Ajustando dados enviados
            const cooldownDb = (fs.existsSync(dir)) ? await this.#tryRequire() : {}; 
            globalUpdateFileObj = { ...cooldownDb, ...globalUpdateFileObj };

            globalUpdateFileObj = Object.fromEntries(Object.entries(globalUpdateFileObj).filter(([, value]) => value !== null));
            const arrayUpdated = { ...globalUpdateFileObj };

            if (!Object.keys(arrayUpdated).length) return (fs.existsSync(dir)) ? fs.unlinkSync(dir) : undefined;
            const objDados = Object.entries(arrayUpdated).map(([key, value]) => `'${key}': ${value},`);
                
            // Atualizando arquivo
            const editFile = {
                start: '/* eslint-disable */\n' +
                        '// Curioso(a)!',
                middle: 'const dados = {\n' +
                    '    ' + objDados.join('\n    ') +
                    '\n};',
                end: 'module.exports = dados;',
            };

            fs.writeFile(dir, Object.values(editFile).join('\n\n'), () => { globalHasInTimeout = false; });
        }, 1000);
    }
}

/**
 * - Classe para configurar erros ao usar funções indevidamente.
 * - Por ser estrutura interna, não há verificação de erros nos parâmetros. 
 * - (Hipocrisia não verificar erros justo na classe de **configuração de erros**).
 * 
 * @example
 * const cooldownError = new CooldownError(code, { valores }, { exemplo });
*/
class CooldownError extends Error {
    #name = 'Param Error';

    /**
     * - Captura de erros internos.
     * @param {number} code Número/posição do erro.
     * 
     * @param {object} valores Object dos valores enviados e recebidos.
     * @param {string} valores.received Valor recebido.
     * @param {string} valores.required Valor necessário.
     * 
     * @param {object} exemplo Object dos exemplos requeridos.
     * @param {string} exemplo.function Exemplo da função: "`set(x)` | `delete(x)` | `get(x)`".
     * @param {string} exemplo.param Parâmetro da função que obteve este erro.
     */
    constructor(code, valores, exemplo) {
        // Constuindo variáveis
        const colors = nodeColors();
        const err = errors();

        super(`${err.title}\n${err.description}`);

        this.name = this.#name;
        this.code = err.code;

        /** - Construção dos erros em função do `code` enviado. */
        function errors() {
            let title = ''; 
            let description = '';

            // Erro de parâmetro inválido na classe "Cooldown"
            if (code === 1) {
                code = '[01]';
                title = `${colors.vermelho(`Parâmetro`)} ${colors.azul(colors.utils.sublinhado + exemplo.param)} ${colors.vermelho('necessário!')}\n`;
                description = 
                    `➥ Foi enviado ${colors.amarelo((typeof valores.received === 'object') ? JSON.stringify(valores.received) : valores.received)} (tipo: ${(Array.isArray(valores.received) ? 'Array' : typeof valores.received)})\n` +
                    `  ➥ Era preciso um(a) ${colors.azul(colors.utils.sublinhado + valores.required)}\n` +
                    `    ➥ Em: <Cooldown>.${exemplo.function.replace(exemplo.param, colors.vermelho(colors.utils.sublinhado + exemplo.param))}\n`;
            }

            // Erro de parâmetro inválido na classe "CooldownCollector"
            if (code === 2) {
                code = '[02]';
                title = `${colors.vermelho(`Parâmetro`)} ${colors.azul(colors.utils.sublinhado + exemplo.param)} ${colors.vermelho('necessário!')}\n`;
                description = 
                `➥ Foi enviado ${colors.amarelo((typeof valores.received === 'object') ? JSON.stringify(valores.received) : valores.received)} (tipo: ${(Array.isArray(valores.received) ? 'Array' : typeof valores.received)})\n` +
                    `  ➥ Era preciso um(a) ${colors.azul(colors.utils.sublinhado + valores.required)}\n` +
                    `    ➥ Em: <CooldownCollector>.${exemplo.function.replace(exemplo.param, colors.vermelho(colors.utils.sublinhado + exemplo.param))}\n`;
            }

            // Erro de caracteres "\" e "'" inválidos
            if (code === 3) {
                code = '[03]';
                title = `${colors.vermelho(`Caractere inválido!`)}\n`;
                description = 
                `➥ Foi enviado ${colors.amarelo((typeof valores.received === 'object') ? JSON.stringify(valores.received) : valores.received)} (tipo: ${(Array.isArray(valores.received) ? 'Array' : typeof valores.received)})\n` +
                    `  ➥ Não pode conter ${colors.azul(colors.utils.sublinhado + valores.required.map(m => `"${m}"`).join(', '))} na String\n` +
                    `    ➥ Em: <AnyCooldown>.${exemplo.function.replace(exemplo.param, colors.vermelho(colors.utils.sublinhado + exemplo.param))}\n`;
            }
            return { code, title, description };
        }
    }
}

/** Pacote de cores/utilidades de enfeite para `CooldownError's` (mantido somente os enfeites usados). */
function nodeColors() {
    // Adicional
    const utils = {
        resetar: '\x1b[0m',
        sublinhado: '\x1b[4m',
    };

    // Cores em String Function prontas
    const cores = {
        vermelho: (text) => `\x1b[31m${text}${utils.resetar}`,
        amarelo: (text) => `\x1b[33m${text}${utils.resetar}`,
        azul: (text) => `\x1b[34m${text}${utils.resetar}`,
        utils,
    };
    return cores;
}

// Inicializando...
await getDatabase();
activeTimeout();

/** Busca a database local. */
async function getDatabase() {
    const dados = await tryRequire();
    globalMap = new Map(Object.entries(dados));

    /**
     * - Deleta o cache do arquivo `cooldownDb.cjs` e faz uma nova importação.
     * - Mostra uma mensagem no console se não for possível concluir a operação.
     * @returns {{user?: time}}
     */
    async function tryRequire() {
        try {
            if (!fs.existsSync(dir)) return {};
            delete require.cache[require.resolve(dir)]; 
            return require('./cooldownDb.cjs'); 
        } 
        catch (err) { 
            console.error(nodeColors().vermelho(`\n⇣ COOLDOWN ⇣ \nArquivo de dados registrados (cooldownDb.cjs) encontra-se corrompido.`) + 
                '\n➥ Foi necessário reformular o arquivo!\n\n', err);
            return {};
        }
    }
}

/** Executa o cooldown localmente para continuar após projeto reiniciar (funciona em conjunto com `getDatabase()`. */
function activeTimeout() {
    const dados = Object.fromEntries([...globalMap]);
    const localCooldown = new Cooldown();
    globalTemporaryMap = new Map();

    if (!Object.keys(localCooldown.get()).length) return;
    
    for (const key in dados) {
        // Ajustando dados
        const seconds = dados[key] - (parseInt(new Date().getTime() / 1000));

        // Ativando o cooldown
        globalTemporaryMap.set(key, dados[key]);
        localCooldown.set(key, { segundos: seconds });
    }
    globalTemporaryMap.clear();
}

/**
 * @typedef {Object} UserAndTimeObject
 * @property {Number} time Timestamp do diretório/usuário.
 * @property {String} user Nome do diretório/usuário.
*/
/** @typedef {keyof typeof listenerType} ListenersName */

// Exportando variáveis para serem usadas externalmente
/**
 * - Variável para controlar cooldown/delays de funções. 
 * - Serve para quaisquer tipos de cooldown que precisar (sua imaginação é o limite).
 * - Alguns casos podem ser: **comandos**, **banimentos temporários** e **lembretes**.
*/
export const cooldown = new Cooldown();

/**
 * - Variável para receber os eventos de cooldowns.
 * - Podendo receber quando um cooldown for: **criado**, **finalizado** e **deletado**.
*/
export const cooldownCollector = new CooldownCollector();