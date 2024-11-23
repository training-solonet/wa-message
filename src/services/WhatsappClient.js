import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

const whatsappClient = new Client({
  puppeteer: { 
    headless: false,
    executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
   },
  authStrategy: new LocalAuth(),
  logLevel: 'verbose',
});

whatsappClient.on("qr", (qr) => {
  console.log(
    "QR Code diterima. Silakan pindai menggunakan aplikasi WhatsApp."
  );
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', async () => {
  console.log('Client is ready!');

  // Mendapatkan semua chat
  const chats = await whatsappClient.getChats();

  // Filter untuk mendapatkan chat grup saja
  const groups = chats.filter(chat => chat.isGroup);

  groups.forEach(group => {
      console.log(`Nama Grup: ${group.name} - ID Grup: ${group.id._serialized}`);
  });
});

whatsappClient.on("disconnected", (reason) => {
  console.log("Client disconnected due to", reason);
  setTimeout(async () => {
    console.log("Attempting to reconnect...");
    await whatsappClient.initialize();
  }, 10000); 
});

whatsappClient.on('error', (error) => {
  console.error('Client encountered an error:', error);
});

export default whatsappClient;
