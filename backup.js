const TelegramBot = require('node-telegram-bot-api');
const cron = require('cron');
const fs = require('fs-extra');
const archiver = require('archiver');
const path = require('path');

const settings = require('./settings.json');

const api = settings.api;
const defaultChatId = settings.chatidpengguna;
const dbfolder = settings.databasepath;
const buatpathfolderbaru = settings.buatpathfolderbaru;

const bot = new TelegramBot(token, { polling: true });

let autoBackupActive = false;

const buatbackup = async () => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '_').slice(0, 19);
    const tempatzip = path.join(buatpathfolderbaru, `backuphariini_${timestamp}.zip`);

    await fs.ensureDir(buatpathfolderbaru);

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(tempatzip);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(tempatzip));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(dbfolder, false);
        archive.finalize();
    });
};

bot.onText(/!autobackup/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const backupZip = await buatbackup();
        await bot.sendMessage(chatId, 'Backup Otw');
        await bot.sendDocument(chatId, backupZip);
    } catch (error) {
        await bot.sendMessage(chatId, `Terjadi kesalahan saat membuat backup: ${error.message}`);
    }
});

const autobackup = new cron.CronJob('*/30 * * * * *', async () => {
    if (autoBackupActive) {
        const chatId = defaultChatId;

        try {
            const backupZip = await buatbackup();
            await bot.sendMessage(chatId, 'File .zip akan dikirim');
            await bot.sendDocument(chatId, backupZip);
            await bot.sendMessage(chatId, 'File telah siap, Terimakasih');
        } catch (error) {
            console.error(`Terjadi kesalahan: ${error.message}`);
        }
    }
});

bot.onText(/!autobackup on/, (msg) => {
    const chatId = msg.chat.id;
    if (!autoBackupActive) {
        autoBackupActive = true;
        bot.sendMessage(chatId, 'Auto Backup diaktifkan.');
        autobackup.start();
    } else {
        bot.sendMessage(chatId, 'Auto Backup sudah aktif.');
    }
});

bot.onText(/!autobackup off/, (msg) => {
    const chatId = msg.chat.id;
    if (autoBackupActive) {
        autoBackupActive = false;
        bot.sendMessage(chatId, 'Auto Backup dinonaktifkan.');
        autobackup.stop();
    } else {
        bot.sendMessage(chatId, 'Auto Backup sudah nonaktif.');
    }
});

console.log('AutoBackup Active');

autobackup.start();
autobackup.stop();
