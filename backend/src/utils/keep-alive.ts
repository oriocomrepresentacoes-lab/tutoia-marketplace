import https from 'https';

/**
 * Script para manter o servidor Render ativo.
 * O Render (plano gratuito) dorme após 15 minutos de inatividade.
 * Este script faz um ping a cada 14 minutos.
 */

const URL = 'https://tutoia-backend.onrender.com/';

export const startKeepAlive = () => {
    console.log('[Keep-Alive] Inicializando auto-ping para evitar hibernação...');
    
    setInterval(() => {
        https.get(URL, (res) => {
            console.log(`[Keep-Alive] Ping enviado. Status: ${res.statusCode} - ${new Date().toISOString()}`);
        }).on('error', (err) => {
            console.error('[Keep-Alive] Erro no ping:', err.message);
        });
    }, 14 * 60 * 1000); // 14 minutos
};
