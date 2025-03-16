// JoKeRBot - Aplicação Cliente
// Conecta ao servidor via Socket.IO e manipula a interface do usuário

// Variáveis globais
let socket;
let autoScroll = true;
let connected = false;
let botStats = {
    health: 0,
    food: 0,
    xp: 0
};
let serverInfo = {
    address: '',
    version: '',
    players: 0,
    maxPlayers: 0
};
let currentMode = 'normal';
let spotifyConnected = false;
let latestMinecraftVersion = '1.21';
let antiAfkActive = false;

// Configurações do Bot - Estado salvo
let botState = {
    server: '',
    username: '',
    version: '1.21',
    isConnected: false,
    lastConnectionTime: null
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Reproduzir vídeo de carregamento e inicializar UI após vídeo
    setupLoadingScreen();
});

function initializeUI() {
    // Conectar ao servidor Socket.IO
    socket = io();
    
    // Configurar listeners de eventos
    setupEventListeners();
    setupSocketEvents();
    
    // Carregar configurações armazenadas
    loadSettings();
    
    // Adicionar mensagem de boas-vindas ao console
    addConsoleMessage('Sistema', 'JoKeRBot - Painel de Controle inicializado. Conecte-se a um servidor para começar.', 'info');
}

function setupEventListeners() {
    // Botão de conexão
    document.getElementById('connect-btn').addEventListener('click', connectBot);
    
    // Botões de controle
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const command = btn.getAttribute('data-command');
            handlePanelCommand(command);
        });
    });
    
    // Entrada de comandos
    document.getElementById('send-command').addEventListener('click', sendCommand);
    document.getElementById('command-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendCommand();
        }
    });
    
    // Controles do console
    document.getElementById('clear-console').addEventListener('click', clearConsole);
    document.getElementById('auto-scroll').addEventListener('click', (e) => {
        autoScroll = !autoScroll;
        e.currentTarget.classList.toggle('active', autoScroll);
    });
    
    // Configurar todos os botões de fechar modais
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modalId = closeBtn.getAttribute('data-modal');
            if (modalId) {
                document.getElementById(`${modalId}-modal`).classList.remove('show');
            } else {
                // Se não tiver um data-modal específico, procura o modal pai
                const modalElement = closeBtn.closest('.modal');
                if (modalElement) {
                    modalElement.classList.remove('show');
                }
            }
        });
    });
    
    // Botões para abrir modal de navegação
    document.querySelectorAll('[data-command="navegacao"]').forEach(btn => {
        btn.addEventListener('click', openNavegacaoModal);
    });
    
    // Botões para abrir modal de mineração
    document.querySelectorAll('[data-command="mineracao"]').forEach(btn => {
        btn.addEventListener('click', openMineracaoModal);
    });
    
    // Botões dentro do modal de navegação
    document.getElementById('iniciar-navegacao').addEventListener('click', iniciarNavegacao);
    document.getElementById('parar-navegacao').addEventListener('click', pararNavegacao);
    document.getElementById('fechar-navegacao').addEventListener('click', () => {
        document.getElementById('navegacao-modal').classList.remove('show');
    });
    
    // Botões dentro do modal de mineração
    document.getElementById('iniciar-mineracao').addEventListener('click', iniciarMineracao);
    document.getElementById('parar-mineracao').addEventListener('click', pararMineracao);
    document.getElementById('fechar-mineracao').addEventListener('click', () => {
        document.getElementById('mineracao-modal').classList.remove('show');
    });
    
    // Modal de configurações
    document.getElementById('save-settings').addEventListener('click', () => {
        saveSettings();
        document.getElementById('settings-modal').classList.remove('show');
    });
    
    document.getElementById('cancel-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('show');
    });
    
    // Atualizador de valor para slider de personalidade
    document.getElementById('personality-level').addEventListener('input', (e) => {
        const value = e.target.value;
        let description;
        
        if (value <= 2) description = 'Bonzinho';
        else if (value <= 4) description = 'Normal';
        else if (value <= 6) description = 'Rebelde';
        else if (value <= 8) description = 'Muito Rebelde';
        else description = 'Extremamente Rebelde';
        
        document.getElementById('personality-value').textContent = `${value} - ${description}`;
    });
    
    // Verificar se há novas versões do Minecraft disponíveis
    checkLatestMinecraftVersion();
}

function setupSocketEvents() {
    // Eventos Socket.IO
    socket.on('connect', () => {
        addConsoleMessage('Sistema', 'Conectado ao servidor de controle.', 'success');
    });
    
    socket.on('disconnect', () => {
        addConsoleMessage('Sistema', 'Desconectado do servidor de controle.', 'error');
        updateBotStatus('offline');
        connected = false;
        toggleConnectionDependentButtons(false);
    });
    
    socket.on('bot:status', (status) => {
        updateBotStatus(status);
    });
    
    socket.on('bot:message', (data) => {
        addConsoleMessage(data.source || 'Bot', data.message, data.type || 'info');
    });
    
    socket.on('bot:stats', (stats) => {
        updateBotStats(stats);
    });
    
    socket.on('server:info', (info) => {
        updateServerInfo(info);
        addConsoleMessage('Servidor', `Servidor: ${info.address} (${info.version}) - Jogadores: ${info.players}/${info.maxPlayers}`, 'info');
    });
    
    socket.on('bot:chat', (data) => {
        addConsoleMessage(data.username || 'Chat', data.message, 'chat');
    });
    
    socket.on('deepseek:status', (status) => {
        updateDeepseekStatus(status);
    });
    
    socket.on('bot:error', (error) => {
        addConsoleMessage('Erro', error, 'error');
        if (error.includes('login') || error.includes('auth') || error.includes('conexão')) {
            updateBotStatus('offline');
            connected = false;
            toggleConnectionDependentButtons(false);
        }
    });
}

function connectBot() {
    if (connected) {
        addConsoleMessage('Sistema', 'O bot já está conectado. Desconecte primeiro.', 'warning');
        return;
    }
    
    const server = document.getElementById('server').value.trim();
    const username = document.getElementById('username').value.trim();
    const version = document.getElementById('version').value;
    
    if (!server || !username) {
        addConsoleMessage('Sistema', 'Por favor, insira o servidor e o nome de usuário.', 'error');
        return;
    }
    
    updateBotStatus('connecting');
    addConsoleMessage('Sistema', `Conectando ao servidor ${server} como ${username}...`, 'info');
    
    socket.emit('bot:connect', { 
        server, 
        username, 
        version,
        options: {
            antiTNT: document.getElementById('anti-tnt').checked,
            personalityLevel: parseInt(document.getElementById('personality-level').value),
            autoReconnect: document.getElementById('auto-reconnect').checked,
            reconnectAttempts: parseInt(document.getElementById('reconnect-attempts').value),
            apiKey: document.getElementById('api-key').value
        }
    });
    
    // Salvar o estado do bot
    saveBotState();
}

function disconnectBot() {
    if (!connected) {
        addConsoleMessage('Sistema', 'O bot não está conectado.', 'warning');
        return;
    }
    
    socket.emit('bot:disconnect');
    addConsoleMessage('Sistema', 'Desconectando do servidor...', 'info');
}

function handlePanelCommand(command) {
    if (!connected && !['configuracoes', 'spotify', 'navegador', 'trocarSkin', 'navegacao', 'mineracao'].includes(command)) {
        addConsoleMessage('Sistema', 'O bot precisa estar conectado para executar este comando.', 'warning');
        return;
    }
    
    switch (command) {
        case 'trocarSkin':
            openSkinModal();
            break;
        case 'inventario':
            socket.emit('bot:command', { command: 'inventario' });
            addConsoleMessage('Sistema', 'Solicitando inventário...', 'info');
            break;
        case 'enderChest':
            socket.emit('bot:command', { command: 'enderChest' });
            addConsoleMessage('Sistema', 'Solicitando ender chest...', 'info');
            break;
        case 'antiAfk':
            toggleAntiAfk();
            break;
        case 'reconectar':
            socket.emit('bot:command', { command: 'reconectar' });
            updateBotStatus('connecting');
            addConsoleMessage('Sistema', 'Tentando reconectar...', 'info');
            break;
        case 'configuracoes':
            openSettings();
            break;
        case 'spotify':
            openSpotifyModal();
            break;
        case 'navegador':
            openBrowserModal();
            break;
        case 'navegacao':
            openNavegacaoModal();
            break;
        case 'mineracao':
            openMineracaoModal();
            break;
        case 'desconectar':
            disconnectBot();
            break;
        default:
            addConsoleMessage('Sistema', `Comando desconhecido: ${command}`, 'warning');
    }
}

function openSkinModal() {
    document.getElementById('skin-modal').classList.add('show');
    
    // Adicionar event listeners para os botões do modal de skin
    document.querySelector('#skin-modal .close-modal').addEventListener('click', () => {
        document.getElementById('skin-modal').classList.remove('show');
    });
    
    document.getElementById('cancel-skin').addEventListener('click', () => {
        document.getElementById('skin-modal').classList.remove('show');
    });
    
    document.getElementById('apply-skin').addEventListener('click', () => {
        const skinUrl = document.getElementById('skin-url').value.trim();
        
        if (!skinUrl) {
            addConsoleMessage('Sistema', 'Por favor, insira uma URL de skin válida.', 'warning');
            return;
        }
        
        if (connected) {
            socket.emit('bot:command', { command: `setskin ${skinUrl}` });
            addConsoleMessage('Sistema', 'Aplicando skin...', 'info');
        } else {
            addConsoleMessage('Sistema', 'O bot precisa estar conectado para trocar a skin.', 'warning');
        }
        
        document.getElementById('skin-modal').classList.remove('show');
    });
    
    // Adicionar event listener para carregar preview da skin
    document.getElementById('skin-url').addEventListener('input', (e) => {
        const url = e.target.value.trim();
        const previewImg = document.getElementById('skin-preview-img');
        const placeholder = document.querySelector('.skin-preview-placeholder');
        
        if (url.match(/namemc\.com\/skin\//i)) {
            // Esta é uma implementação básica. Na realidade, você precisaria extrair a URL da imagem da página do NameMC
            // ou usar uma API para converter a URL do NameMC em uma URL de imagem de skin direta.
            previewImg.style.display = 'block';
            placeholder.style.display = 'none';
            
            // Usando uma imagem genérica para demonstração
            previewImg.src = 'https://via.placeholder.com/200x200?text=Skin+Preview';
        } else {
            previewImg.style.display = 'none';
            placeholder.style.display = 'flex';
        }
    });
}

function openSpotifyModal() {
    document.getElementById('spotify-modal').classList.add('show');
    
    // Adicionar event listeners para os botões do modal
    document.querySelector('#spotify-modal .close-modal').addEventListener('click', () => {
        document.getElementById('spotify-modal').classList.remove('show');
    });
    
    document.getElementById('close-spotify').addEventListener('click', () => {
        document.getElementById('spotify-modal').classList.remove('show');
    });
    
    // Simular conexão com Spotify (apenas para UI, não funcional)
    document.getElementById('spotify-login').disabled = false;
    document.getElementById('spotify-login').addEventListener('click', () => {
        const indicator = document.querySelector('.spotify-indicator');
        const statusText = document.querySelector('#spotify-modal .status-text');
        
        if (spotifyConnected) {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            statusText.textContent = 'Desconectado';
            spotifyConnected = false;
            
            document.getElementById('spotify-prev').disabled = true;
            document.getElementById('spotify-play-pause').disabled = true;
            document.getElementById('spotify-next').disabled = true;
            
            document.getElementById('spotify-login').innerHTML = '<i class="fab fa-spotify"></i> Conectar ao Spotify';
            
            addConsoleMessage('Spotify', 'Desconectado do Spotify.', 'info');
        } else {
            indicator.classList.remove('offline');
            indicator.classList.add('online');
            statusText.textContent = 'Conectado';
            spotifyConnected = true;
            
            document.getElementById('spotify-prev').disabled = false;
            document.getElementById('spotify-play-pause').disabled = false;
            document.getElementById('spotify-next').disabled = false;
            
            document.getElementById('spotify-login').innerHTML = '<i class="fab fa-spotify"></i> Desconectar do Spotify';
            
            addConsoleMessage('Spotify', 'Conectado ao Spotify.', 'success');
        }
    });
}

function openBrowserModal() {
    document.getElementById('browser-modal').classList.add('show');
    
    // Adicionar event listeners para os botões do modal
    document.querySelector('#browser-modal .close-modal').addEventListener('click', () => {
        document.getElementById('browser-modal').classList.remove('show');
    });
    
    document.getElementById('close-browser').addEventListener('click', () => {
        document.getElementById('browser-modal').classList.remove('show');
    });
    
    // Implementar navegação básica
    const urlInput = document.getElementById('browser-url');
    const iframe = document.getElementById('browser-iframe');
    const placeholder = document.querySelector('.browser-placeholder');
    
    document.getElementById('browser-go').addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            try {
                // Verificar se a URL tem protocolo, adicionar https:// se não tiver
                let fullUrl = url;
                if (!url.match(/^https?:\/\//i)) {
                    fullUrl = 'https://' + url;
                    urlInput.value = fullUrl;
                }
                
                // Note: Many sites block iframe embedding due to X-Frame-Options headers
                iframe.style.display = 'block';
                placeholder.style.display = 'none';
                iframe.src = fullUrl;
                
                addConsoleMessage('Navegador', `Carregando: ${fullUrl}`, 'info');
            } catch (error) {
                addConsoleMessage('Navegador', `Erro ao carregar URL: ${error.message}`, 'error');
            }
        }
    });
    
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('browser-go').click();
        }
    });
    
    document.getElementById('browser-refresh').addEventListener('click', () => {
        if (iframe.src) {
            iframe.src = iframe.src;
        }
    });
}

function toggleAntiAfk() {
    if (!connected) {
        addConsoleMessage('Sistema', 'O bot precisa estar conectado para usar o Anti-AFK.', 'warning');
        return;
    }
    
    socket.emit('bot:command', { command: 'antiAfk' });
    antiAfkActive = !antiAfkActive;
    
    const afkButton = document.querySelector('[data-command="antiAfk"]');
    
    if (antiAfkActive) {
        afkButton.classList.add('active');
        afkButton.style.backgroundColor = '#28a745';
        addConsoleMessage('Sistema', 'Modo Anti-AFK ativado.', 'success');
    } else {
        afkButton.classList.remove('active');
        afkButton.style.backgroundColor = '';
        addConsoleMessage('Sistema', 'Modo Anti-AFK desativado.', 'info');
    }
}

function sendCommand() {
    const input = document.getElementById('command-input');
    const command = input.value.trim();
    
    if (!command) return;
    
    if (!connected && command !== 'help') {
        addConsoleMessage('Sistema', 'Conecte-se a um servidor para enviar comandos.', 'warning');
        return;
    }
    
    if (command.toLowerCase() === 'help') {
        showHelpCommands();
    } else {
        socket.emit('bot:command', { command });
        addConsoleMessage('Comando', command, 'info');
    }
    
    input.value = '';
}

function showHelpCommands() {
    const helpText = `Comandos disponíveis:
- help: Mostra esta ajuda
- chat <mensagem>: Envia uma mensagem no chat do servidor
- whisper <usuario> <mensagem>: Envia mensagem privada
- look <entidade>: Olha para uma entidade próxima
- follow <entidade>: Segue uma entidade próxima
- attack <entidade>: Ataca uma entidade próxima
- mine <bloco>: Minera um tipo de bloco
- collect <item>: Coleta itens próximos
- drop <item> [quantidade]: Joga itens fora
- equip <item>: Equipa um item
- unequip: Desequipa o item atual
- eat <comida>: Come um alimento do inventário
- toss: Joga o item da mão principal
- list: Lista jogadores online
- goto <x> <y> <z>: Vai para coordenadas
- find <bloco>: Procura o bloco mais próximo`;
    
    addConsoleMessage('Ajuda', helpText, 'info');
}

function addConsoleMessage(source, message, type = 'info') {
    const consoleOutput = document.getElementById('console-output');
    const now = new Date();
    const timestamp = formatDate(now);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="source">${source}:</span> ${message}`;
    
    consoleOutput.appendChild(messageDiv);
    
    if (autoScroll) {
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
}

function clearConsole() {
    const consoleOutput = document.getElementById('console-output');
    consoleOutput.innerHTML = '';
    addConsoleMessage('Sistema', 'Console limpo.', 'info');
}

function updateBotStatus(status) {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    statusIndicator.className = 'status-indicator';
    
    switch (status) {
        case 'online':
            statusIndicator.classList.add('online');
            statusText.textContent = 'Conectado';
            connected = true;
            toggleConnectionDependentButtons(true);
            
            // Atualizar estado salvo
            botState.isConnected = true;
            saveBotState();
            break;
        case 'connecting':
            statusIndicator.classList.add('connecting');
            statusText.textContent = 'Conectando...';
            connected = false;
            toggleConnectionDependentButtons(false);
            break;
        case 'offline':
        default:
            statusIndicator.classList.add('offline');
            statusText.textContent = 'Desconectado';
            connected = false;
            toggleConnectionDependentButtons(false);
            
            // Resetar estatísticas
            updateBotStats({ health: 0, food: 0, xp: 0 });
            
            // Atualizar estado salvo
            botState.isConnected = false;
            saveBotState();
    }
}

function updateServerStatus(status) {
    // Placeholder para futura expansão
}

function updateDeepseekStatus(status) {
    // Update DeepSeek API status indicator (placeholder)
    const isAvailable = status === 'available';
    addConsoleMessage('Sistema', `DeepSeek IA ${isAvailable ? 'conectada' : 'não disponível'}.`, isAvailable ? 'success' : 'warning');
}

function updateBotStats(stats) {
    botStats = { ...botStats, ...stats };
    
    // Atualizar barras de progresso
    if ('health' in stats) {
        const healthBar = document.getElementById('health-bar');
        const healthValue = document.getElementById('health-value');
        const healthPercent = (stats.health / 20) * 100;
        
        healthBar.style.width = `${healthPercent}%`;
        healthValue.textContent = `${stats.health}/20`;
    }
    
    if ('food' in stats) {
        const foodBar = document.getElementById('food-bar');
        const foodValue = document.getElementById('food-value');
        const foodPercent = (stats.food / 20) * 100;
        
        foodBar.style.width = `${foodPercent}%`;
        foodValue.textContent = `${stats.food}/20`;
    }
    
    if ('xp' in stats) {
        const xpBar = document.getElementById('xp-bar');
        const xpValue = document.getElementById('xp-value');
        const xpPercent = Math.min(stats.xp * 5, 100); // Ajustado para visualização
        
        xpBar.style.width = `${xpPercent}%`;
        xpValue.textContent = stats.xp;
    }
}

function updateServerInfo(info) {
    serverInfo = { ...serverInfo, ...info };
    // Reservado para atualização futura de elementos de UI adicionais
}

function toggleConnectionDependentButtons(enabled) {
    document.querySelectorAll('.control-btn').forEach(btn => {
        const command = btn.getAttribute('data-command');
        if (command !== 'configuracoes') {
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? '1' : '0.6';
        }
    });
    
    // Toggle connect/disconnect button
    const connectBtn = document.getElementById('connect-btn');
    connectBtn.textContent = enabled ? 'Reconectar' : 'Conectar';
    connectBtn.innerHTML = enabled 
        ? '<i class="fas fa-plug"></i> Reconectar' 
        : '<i class="fas fa-plug"></i> Conectar';
}

function openSettings() {
    document.getElementById('settings-modal').classList.add('show');
}

function saveSettings() {
    const personalityLevel = document.getElementById('personality-level').value;
    const antiTNT = document.getElementById('anti-tnt').checked;
    const apiKey = document.getElementById('api-key').value;
    const autoReconnect = document.getElementById('auto-reconnect').checked;
    const reconnectAttempts = document.getElementById('reconnect-attempts').value;
    
    const settings = {
        personalityLevel,
        antiTNT,
        apiKey,
        autoReconnect,
        reconnectAttempts
    };
    
    localStorage.setItem('jokerbot_settings', JSON.stringify(settings));
    
    // Enviar configurações atualizadas para o servidor se estiver conectado
    if (connected) {
        socket.emit('bot:updateSettings', settings);
        addConsoleMessage('Sistema', 'Configurações atualizadas e enviadas para o bot.', 'success');
    } else {
        addConsoleMessage('Sistema', 'Configurações salvas. Serão aplicadas na próxima conexão.', 'info');
    }
}

function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('jokerbot_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            if (settings.personalityLevel) {
                const slider = document.getElementById('personality-level');
                slider.value = settings.personalityLevel;
                let description;
                if (settings.personalityLevel <= 2) description = 'Bonzinho';
                else if (settings.personalityLevel <= 4) description = 'Normal';
                else if (settings.personalityLevel <= 6) description = 'Rebelde';
                else if (settings.personalityLevel <= 8) description = 'Muito Rebelde';
                else description = 'Extremamente Rebelde';
                document.getElementById('personality-value').textContent = `${settings.personalityLevel} - ${description}`;
            }
            
            if (settings.antiTNT !== undefined) {
                document.getElementById('anti-tnt').checked = settings.antiTNT;
            }
            
            if (settings.apiKey) {
                document.getElementById('api-key').value = settings.apiKey;
            }
            
            if (settings.autoReconnect !== undefined) {
                document.getElementById('auto-reconnect').checked = settings.autoReconnect;
            }
            
            if (settings.reconnectAttempts) {
                document.getElementById('reconnect-attempts').value = settings.reconnectAttempts;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

function formatDate(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

// Configuração da tela de carregamento com vídeo e áudio
function setupLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingVideo = document.getElementById('loading-video');
    
    // Garantir que o vídeo tenha áudio habilitado
    loadingVideo.muted = false;
    loadingVideo.volume = 0.5; // Volume a 50%
    
    // Se o vídeo não puder ser carregado, pular a animação
    loadingVideo.addEventListener('error', () => {
        console.error('Erro ao carregar o vídeo de intro!');
        loadingScreen.classList.add('hidden');
        initializeUI();
        loadSavedBotState();
    });
    
    // Forçar carregamento de metadados para garantir que o vídeo esteja pronto
    loadingVideo.load();
    
    // Quando o vídeo terminar de carregar, inicializar a UI e reproduzir com áudio
    loadingVideo.addEventListener('loadedmetadata', () => {
        console.log('Vídeo de intro carregado, reproduzindo com áudio...');
        
        // Ativar o áudio explicitamente (importante para alguns navegadores)
        const playPromise = loadingVideo.play();
        
        // Lidar com erros de reprodução (comum quando o áudio não é permitido)
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Erro ao reproduzir vídeo com áudio:', error);
                // Tenta novamente sem áudio como fallback
                loadingVideo.muted = true;
                loadingVideo.play().catch(e => {
                    console.error('Falha total ao reproduzir vídeo:', e);
                    // Último recurso: pular o vídeo
                    loadingScreen.classList.add('hidden');
                    initializeUI();
                    loadSavedBotState();
                });
            });
        }
    });
    
    // Quando o vídeo terminar, remover a tela de carregamento e iniciar a aplicação
    loadingVideo.addEventListener('ended', () => {
        // Animar a saída da tela de carregamento
        loadingScreen.classList.add('hidden');
        
        // Iniciar a aplicação após a animação de saída
        setTimeout(() => {
            initializeUI();
            loadSavedBotState();
        }, 500);
    });
    
    // Fallback: Se depois de 10 segundos o vídeo ainda não terminou, forçar a inicialização
    setTimeout(() => {
        if (!loadingScreen.classList.contains('hidden')) {
            loadingScreen.classList.add('hidden');
            initializeUI();
            loadSavedBotState();
        }
    }, 10000);
}

// Funções para gerenciar o estado salvo do bot
function saveBotState() {
    // Atualizar o estado do bot
    botState = {
        server: document.getElementById('server').value,
        username: document.getElementById('username').value,
        version: document.getElementById('version').value,
        isConnected: connected,
        lastConnectionTime: new Date().toISOString()
    };
    
    // Salvar no localStorage
    localStorage.setItem('jokerbot_state', JSON.stringify(botState));
}

function loadSavedBotState() {
    try {
        const savedState = localStorage.getItem('jokerbot_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Preencher os campos do formulário
            if (state.server) document.getElementById('server').value = state.server;
            if (state.username) document.getElementById('username').value = state.username;
            if (state.version) document.getElementById('version').value = state.version;
            
            botState = state;
            
            // Se o bot estava conectado anteriormente, mostrar mensagem
            if (state.isConnected && state.lastConnectionTime) {
                const lastConnection = new Date(state.lastConnectionTime);
                const formattedDate = lastConnection.toLocaleString();
                addConsoleMessage('Sistema', `Última conexão como ${state.username} em ${state.server} (${formattedDate}).`, 'info');
                addConsoleMessage('Sistema', 'Use o botão "Conectar" para reconectar.', 'info');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar estado do bot:', error);
    }
}

// Função para verificar a versão mais recente do Minecraft
function checkLatestMinecraftVersion() {
    // Simulação de detecção de versão mais recente
    const currentLatestVersion = '1.21';
    
    // Na vida real, isso poderia fazer uma chamada a uma API para verificar novas versões
    
    if (currentLatestVersion === latestMinecraftVersion) {
        // A versão atual já é a mais recente
        return;
    } else {
        // Atualizar a versão mais recente
        latestMinecraftVersion = currentLatestVersion;
        
        // Adicionar a nova versão à lista de opções se não estiver presente
        const versionSelect = document.getElementById('version');
        let versionExists = false;
        
        for (let i = 0; i < versionSelect.options.length; i++) {
            if (versionSelect.options[i].value === latestMinecraftVersion) {
                versionExists = true;
                break;
            }
        }
        
        if (!versionExists) {
            const newOption = document.createElement('option');
            newOption.value = latestMinecraftVersion;
            newOption.text = latestMinecraftVersion;
            versionSelect.insertBefore(newOption, versionSelect.firstChild);
            versionSelect.value = latestMinecraftVersion; // Selecionar a nova versão por padrão
            
            addConsoleMessage('Sistema', `Nova versão do Minecraft detectada: ${latestMinecraftVersion}. Opção adicionada ao seletor de versão.`, 'success');
        }
    }
}

// Funções para Navegação e Mineração

function openNavegacaoModal() {
    document.getElementById('navegacao-modal').classList.add('show');
    
    // Atualizar a posição atual se o bot estiver conectado
    if (connected && socket) {
        socket.emit('bot:getPosition');
        socket.once('bot:position', (position) => {
            document.getElementById('pos-atual').textContent = `X:${Math.round(position.x)}, Y:${Math.round(position.y)}, Z:${Math.round(position.z)}`;
        });
        
        // Verificar status de navegação atual
        socket.emit('bot:getNavStatus');
        socket.once('bot:navStatus', (status) => {
            document.getElementById('nav-status').textContent = status.active ? 'Navegando' : 'Inativo';
            if (status.destination) {
                document.getElementById('pos-destino').textContent = 
                    `X:${Math.round(status.destination.x)}, Y:${Math.round(status.destination.y)}, Z:${Math.round(status.destination.z)}`;
            } else {
                document.getElementById('pos-destino').textContent = 'Nenhum';
            }
        });
    }
}

function iniciarNavegacao() {
    if (!connected) {
        addConsoleMessage('Sistema', 'O bot precisa estar conectado para navegar.', 'warning');
        return;
    }
    
    const x = parseInt(document.getElementById('coord-x').value);
    const y = parseInt(document.getElementById('coord-y').value);
    const z = parseInt(document.getElementById('coord-z').value);
    
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        addConsoleMessage('Sistema', 'Por favor, insira coordenadas válidas.', 'warning');
        return;
    }
    
    socket.emit('bot:command', { command: `goto ${x} ${y} ${z}` });
    
    document.getElementById('pos-destino').textContent = `X:${x}, Y:${y}, Z:${z}`;
    document.getElementById('nav-status').textContent = 'Navegando';
    
    addConsoleMessage('Navegação', `Navegando para X:${x}, Y:${y}, Z:${z}`, 'info');
}

function pararNavegacao() {
    if (!connected) {
        return;
    }
    
    socket.emit('bot:command', { command: 'parar' });
    document.getElementById('nav-status').textContent = 'Inativo';
    addConsoleMessage('Navegação', 'Navegação interrompida.', 'info');
}

function openMineracaoModal() {
    document.getElementById('mineracao-modal').classList.add('show');
    
    // Atualizar status de mineração se o bot estiver conectado
    if (connected && socket) {
        socket.emit('bot:getMiningStatus');
        socket.once('bot:miningStatus', (status) => {
            document.getElementById('min-status').textContent = status.active ? 'Minerando' : 'Inativo';
            document.getElementById('bloco-alvo').textContent = status.target || 'Nenhum';
            
            // Pré-selecionar o bloco atual no dropdown, se houver
            if (status.target) {
                const selectBloco = document.getElementById('tipo-bloco');
                for (let i = 0; i < selectBloco.options.length; i++) {
                    if (selectBloco.options[i].value === status.target) {
                        selectBloco.selectedIndex = i;
                        break;
                    }
                }
            }
        });
    }
}

function iniciarMineracao() {
    if (!connected) {
        addConsoleMessage('Sistema', 'O bot precisa estar conectado para minerar.', 'warning');
        return;
    }
    
    const tipoBloco = document.getElementById('tipo-bloco').value;
    
    socket.emit('bot:command', { command: `minerar ${tipoBloco}` });
    
    document.getElementById('bloco-alvo').textContent = tipoBloco;
    document.getElementById('min-status').textContent = 'Minerando';
    
    addConsoleMessage('Mineração', `Procurando e minerando ${tipoBloco}`, 'info');
}

function pararMineracao() {
    if (!connected) {
        return;
    }
    
    socket.emit('bot:command', { command: 'parar' });
    document.getElementById('min-status').textContent = 'Inativo';
    addConsoleMessage('Mineração', 'Mineração interrompida.', 'info');
}