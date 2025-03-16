// JoKeRBot - Painel de Controle JavaScript

// Conexão com o Socket.io
const socket = io();

// Elementos da interface
const consoleOutput = document.getElementById('console-output');
const commandInput = document.getElementById('command-input');
const sendCommandBtn = document.getElementById('send-command-btn');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const serverAddressInput = document.getElementById('server-address');
const usernameInput = document.getElementById('username');
const pingValue = document.getElementById('ping-value');
const tpsValue = document.getElementById('tps-value');
const playersValue = document.getElementById('players-value');
const healthValue = document.getElementById('health-value');
const foodValue = document.getElementById('food-value');
const xpValue = document.getElementById('xp-value');
const positionValue = document.getElementById('position-value');
const botStatusIndicator = document.getElementById('bot-status-indicator');
const serverStatusIndicator = document.getElementById('server-status-indicator');
const deepseekStatusIndicator = document.getElementById('deepseek-status-indicator');

// Botões de funcionalidades
const skinBtn = document.getElementById('skin-btn');
const inventoryBtn = document.getElementById('inventory-btn');
const enderchestBtn = document.getElementById('enderchest-btn');
const afkBtn = document.getElementById('afk-btn');
const reconnectBtn = document.getElementById('reconnect-btn');
const settingsBtn = document.getElementById('settings-btn');
const spotifyBtn = document.getElementById('spotify-btn');
const navigatorBtn = document.getElementById('navigator-btn');

// Estado do bot
let botState = {
    connected: false,
    afk: false,
    inventory: null,
    health: 0,
    food: 0,
    position: { x: 0, y: 0, z: 0 },
    ping: 0,
    tps: 0,
    players: []
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    setupEventListeners();
    setupSocketEvents();
    
    // Carregar as últimas configurações do localStorage
    loadSettings();
    
    // Atualizar status inicial
    updateBotStatus('offline');
    updateServerStatus('offline');
    updateDeepseekStatus('offline');
    
    addConsoleMessage('Sistema', 'Painel de controle JoKeRBot iniciado', 'info');
    addConsoleMessage('Sistema', 'Pronto para conectar a um servidor Minecraft', 'info');
});

// Inicializar a interface do usuário
function initializeUI() {
    // Desabilitar botões que requerem conexão
    toggleConnectionDependentButtons(false);
}

// Configurar event listeners
function setupEventListeners() {
    // Evento de envio de comando
    sendCommandBtn.addEventListener('click', sendCommand);
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendCommand();
        }
    });
    
    // Eventos de conexão
    connectBtn.addEventListener('click', connectBot);
    disconnectBtn.addEventListener('click', disconnectBot);
    
    // Eventos dos botões de funcionalidades
    skinBtn.addEventListener('click', () => sendBotAction('changeSkin'));
    inventoryBtn.addEventListener('click', () => sendBotAction('showInventory'));
    enderchestBtn.addEventListener('click', () => sendBotAction('showEnderChest'));
    afkBtn.addEventListener('click', toggleAFK);
    reconnectBtn.addEventListener('click', () => sendBotAction('reconnect'));
    settingsBtn.addEventListener('click', openSettings);
    spotifyBtn.addEventListener('click', () => sendBotAction('toggleSpotify'));
    navigatorBtn.addEventListener('click', () => sendBotAction('toggleNavigator'));
}

// Configurar eventos do Socket.io
function setupSocketEvents() {
    // Evento de conexão com o servidor Websocket
    socket.on('connect', () => {
        addConsoleMessage('Sistema', 'Conectado ao servidor websocket', 'info');
        updateDeepseekStatus('checking');
    });
    
    // Evento de desconexão do servidor Websocket
    socket.on('disconnect', () => {
        addConsoleMessage('Sistema', 'Desconectado do servidor websocket', 'error');
        updateBotStatus('offline');
        updateServerStatus('offline');
        updateDeepseekStatus('offline');
        toggleConnectionDependentButtons(false);
    });
    
    // Eventos do bot
    socket.on('bot:connected', (data) => {
        botState.connected = true;
        updateBotStatus('online');
        updateServerStatus('online');
        addConsoleMessage('Sistema', `Bot conectado a ${data.server}`, 'success');
        toggleConnectionDependentButtons(true);
    });
    
    socket.on('bot:disconnected', (reason) => {
        botState.connected = false;
        updateBotStatus('offline');
        updateServerStatus('offline');
        addConsoleMessage('Sistema', `Bot desconectado: ${reason}`, 'error');
        toggleConnectionDependentButtons(false);
    });
    
    socket.on('bot:error', (error) => {
        addConsoleMessage('Erro', error, 'error');
    });
    
    socket.on('bot:message', (data) => {
        addConsoleMessage(data.source, data.message, data.type);
    });
    
    socket.on('bot:stats', (stats) => {
        updateBotStats(stats);
    });
    
    socket.on('server:status', (status) => {
        updateServerInfo(status);
    });
    
    socket.on('deepseek:status', (status) => {
        updateDeepseekStatus(status ? 'online' : 'offline');
    });
    
    socket.on('command:result', (result) => {
        addConsoleMessage('Comando', result.message, result.success ? 'success' : 'error');
    });
}

// Funções de controle do bot
function connectBot() {
    const server = serverAddressInput.value.trim();
    const username = usernameInput.value.trim();
    
    if (!server) {
        addConsoleMessage('Sistema', 'Por favor, insira um endereço de servidor', 'error');
        return;
    }
    
    if (!username) {
        addConsoleMessage('Sistema', 'Por favor, insira um nome de usuário', 'error');
        return;
    }
    
    // Salvar configurações
    localStorage.setItem('jokerbot_server', server);
    localStorage.setItem('jokerbot_username', username);
    
    addConsoleMessage('Sistema', `Conectando a ${server} como ${username}...`, 'info');
    updateBotStatus('connecting');
    updateServerStatus('checking');
    
    socket.emit('bot:connect', { server, username });
}

function disconnectBot() {
    if (botState.connected) {
        socket.emit('bot:disconnect');
        addConsoleMessage('Sistema', 'Desconectando o bot...', 'info');
    }
}

function sendCommand() {
    const command = commandInput.value.trim();
    
    if (!command) return;
    
    if (!botState.connected && !command.startsWith('/')) {
        addConsoleMessage('Sistema', 'Bot não está conectado. Conecte-se primeiro.', 'error');
        return;
    }
    
    // Comandos internos do painel começam com /
    if (command.startsWith('/')) {
        handlePanelCommand(command);
    } else {
        socket.emit('bot:command', { command });
        addConsoleMessage('Você', command, 'command');
    }
    
    commandInput.value = '';
}

function handlePanelCommand(command) {
    const cmd = command.slice(1).toLowerCase();
    
    switch(cmd) {
        case 'help':
            showHelpCommands();
            break;
        case 'clear':
            clearConsole();
            break;
        case 'status':
            showBotStatus();
            break;
        case 'settings':
            openSettings();
            break;
        case 'connect':
            connectBot();
            break;
        case 'disconnect':
            disconnectBot();
            break;
        default:
            addConsoleMessage('Sistema', `Comando desconhecido: ${command}`, 'error');
            addConsoleMessage('Sistema', 'Digite /help para ajuda', 'info');
    }
}

function showHelpCommands() {
    const helpMessages = [
        'Comandos disponíveis:',
        '/help - Mostra esta ajuda',
        '/clear - Limpa o console',
        '/status - Mostra o status do bot',
        '/settings - Abre as configurações',
        '/connect - Conecta o bot',
        '/disconnect - Desconecta o bot',
        '',
        'Você também pode enviar comandos diretos para o Minecraft quando conectado.'
    ];
    
    helpMessages.forEach(msg => {
        addConsoleMessage('Ajuda', msg, 'info');
    });
}

function sendBotAction(action, params = {}) {
    if (!botState.connected && action !== 'reconnect') {
        addConsoleMessage('Sistema', 'Bot não está conectado. Conecte-se primeiro.', 'error');
        return;
    }
    
    socket.emit('bot:action', { action, ...params });
    addConsoleMessage('Sistema', `Executando ação: ${action}`, 'info');
}

function toggleAFK() {
    botState.afk = !botState.afk;
    sendBotAction('toggleAFK', { state: botState.afk });
    
    if (botState.afk) {
        afkBtn.classList.add('active');
        addConsoleMessage('Sistema', 'Modo AFK ativado', 'info');
    } else {
        afkBtn.classList.remove('active');
        addConsoleMessage('Sistema', 'Modo AFK desativado', 'info');
    }
}

function openSettings() {
    // Implementar janela de configurações
    addConsoleMessage('Sistema', 'Funcionalidade de configurações em desenvolvimento', 'info');
}

// Funções de atualização da interface
function addConsoleMessage(source, message, type = 'info') {
    const div = document.createElement('div');
    
    // Formatar a hora atual
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    div.innerHTML = `<span class="console-time">[${timeStr}]</span> <span class="console-source">[${source}]</span> ${message}`;
    
    // Aplicar classe baseada no tipo de mensagem
    div.classList.add(`console-${type}`);
    
    consoleOutput.appendChild(div);
    
    // Rolagem automática para o final
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
    consoleOutput.innerHTML = '';
    addConsoleMessage('Sistema', 'Console limpo', 'info');
}

function updateBotStatus(status) {
    const indicator = botStatusIndicator;
    
    indicator.className = 'resource-indicator';
    
    switch(status) {
        case 'online':
            indicator.classList.add('online');
            break;
        case 'offline':
            indicator.classList.add('offline');
            break;
        case 'connecting':
            indicator.classList.add('warning');
            break;
        default:
            indicator.classList.add('offline');
    }
}

function updateServerStatus(status) {
    const indicator = serverStatusIndicator;
    
    indicator.className = 'resource-indicator';
    
    switch(status) {
        case 'online':
            indicator.classList.add('online');
            break;
        case 'offline':
            indicator.classList.add('offline');
            break;
        case 'checking':
            indicator.classList.add('warning');
            break;
        default:
            indicator.classList.add('offline');
    }
}

function updateDeepseekStatus(status) {
    const indicator = deepseekStatusIndicator;
    
    indicator.className = 'resource-indicator';
    
    switch(status) {
        case 'online':
            indicator.classList.add('online');
            break;
        case 'offline':
            indicator.classList.add('offline');
            break;
        case 'checking':
            indicator.classList.add('warning');
            break;
        default:
            indicator.classList.add('offline');
    }
}

function updateBotStats(stats) {
    botState = { ...botState, ...stats };
    
    if (stats.health !== undefined) {
        healthValue.textContent = `${Math.round(stats.health)}/20`;
    }
    
    if (stats.food !== undefined) {
        foodValue.textContent = `${Math.round(stats.food)}/20`;
    }
    
    if (stats.xp !== undefined) {
        xpValue.textContent = `${stats.xp.level} (${Math.round(stats.xp.progress * 100)}%)`;
    }
    
    if (stats.position) {
        const { x, y, z } = stats.position;
        positionValue.textContent = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    }
}

function updateServerInfo(info) {
    if (info.ping !== undefined) {
        pingValue.textContent = `${info.ping}ms`;
    }
    
    if (info.tps !== undefined) {
        tpsValue.textContent = info.tps.toFixed(1);
    }
    
    if (info.players) {
        playersValue.textContent = `${info.players.online}/${info.players.max}`;
    }
}

function toggleConnectionDependentButtons(enabled) {
    const buttons = [
        skinBtn, inventoryBtn, enderchestBtn, afkBtn, 
        reconnectBtn, spotifyBtn, navigatorBtn, disconnectBtn
    ];
    
    buttons.forEach(btn => {
        btn.disabled = !enabled;
        
        if (enabled) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    });
    
    if (enabled) {
        connectBtn.disabled = true;
        connectBtn.classList.add('disabled');
    } else {
        connectBtn.disabled = false;
        connectBtn.classList.remove('disabled');
    }
}

function showBotStatus() {
    if (!botState.connected) {
        addConsoleMessage('Sistema', 'Bot não está conectado', 'info');
        return;
    }
    
    addConsoleMessage('Status', `Conectado: ${botState.connected}`, 'info');
    addConsoleMessage('Status', `Modo AFK: ${botState.afk ? 'Ativado' : 'Desativado'}`, 'info');
    addConsoleMessage('Status', `Saúde: ${botState.health}/20`, 'info');
    addConsoleMessage('Status', `Comida: ${botState.food}/20`, 'info');
    addConsoleMessage('Status', `Posição: X: ${Math.round(botState.position.x)}, Y: ${Math.round(botState.position.y)}, Z: ${Math.round(botState.position.z)}`, 'info');
    addConsoleMessage('Status', `Ping: ${botState.ping}ms`, 'info');
    addConsoleMessage('Status', `TPS: ${botState.tps.toFixed(1)}`, 'info');
}

// Funções de persistência
function loadSettings() {
    const server = localStorage.getItem('jokerbot_server');
    const username = localStorage.getItem('jokerbot_username');
    
    if (server) {
        serverAddressInput.value = server;
    }
    
    if (username) {
        usernameInput.value = username;
    }
}

// Funções de utilidade
function formatDate(date) {
    return date.toLocaleString();
}