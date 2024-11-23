import express from "express";
import axios from "axios";
import whatsappClient from "../services/WhatsappClient.js";
import pkg from "whatsapp-web.js";
import Informan from "../models/Informan.js";
import fs from "fs";
const { MessageMedia } = pkg;

const router = new express.Router();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.get("/", (req, res) => {
  res.send("API is running");
});

router.get("/get-groups-members", async (req, res) => {
  // Ganti dengan ID grup Anda
  const groupId = "120363225953135948@g.us";
  const groupMembers = [];
  try {
    const chat = await whatsappClient.getChatById(groupId);
    if (chat.isGroup) {
      // Mengakses daftar peserta langsung dari properti `participants`
      chat.participants.forEach((participant) => {
        groupMembers.push(participant.id.user);
      });
    }
    res.send({ groupMembers });
  } catch (error) {
    console.error("Error:", error);
  }
});

router.get('/check-message', async (req, res) => {
  const chatId = req.query.chatId;
  const messages = await whatsappClient.getChatById(chatId);
  const total_messages = await messages.fetchMessages({ limit: 10 });
  res.send({ total_messages: total_messages });
});

router.get("/message", async (req, res) => {

  const message = "Happy Wedding Anniversary Bapak Andika dan Ibu Hetty 😇";

  // Memuat file video langsung dari path
  const videoMedia = MessageMedia.fromFilePath('./src/assets/video/7.mp4'); // Sesuaikan dengan path file Anda

  // get all informan
  const informan = await Informan.findAll({
    attributes: ["nama", "no_hp"],
    limit: 500,
    offset: 5,
  });

  // change no_hp to 62
  const phone_numbers = informan.map((data) => {
    if (data.no_hp.startsWith("0")) {
      return data.no_hp.replace("0", "62");
    }
    return data.no_hp;
  });

  // except number
  const exceptNumber = [
    "6282135922585",
    "6281328835144",
    "6282135387888",
    "6282322050123",
    "6281314943174"
  ];

  // filter phone_numbers
  const filteredPhoneNumbers = phone_numbers.filter((data) => {
    return !exceptNumber.includes(data);
  });

  // Mengirim video
  let number = 0;
  for (const phone_number of filteredPhoneNumbers) {
    number++;
    try {
      const phoneSuffix = `${
        phone_number
      }@c.us`;
      // send message
      await whatsappClient.sendMessage(phoneSuffix, videoMedia, {
        caption: message,
      });
      console.log(`Message sent to ${number} of ${phone_numbers.length}`);
      // Delay between messages
      const randomDelay = Math.floor(Math.random() * 3000) + 1000;
      await delay(randomDelay);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  res.send({ status: "Message sent successfully" });
});

router.get("/broadcast", async (req, res) => {

  const message = "https://www.tiktok.com/@pasukanandikaperkasa?_t=8pQounykiXZ&_r=1 \nHari pemilihan sudah dekat. Ayo jangan lupa terus sebarkan konten-konten ini di media sosial yang Anda punya. Mari dukung bersama, ANDIKA-HENDI MENANG MUTLAK! 🔥";
  // const mediaUrl = 'http://127.0.0.1:3000/src/assets/photo/12.jpg'; // Sesuaikan dengan path file Anda
  const mediaUrl = null;
  const mediaType = "image"; // Ganti dengan "video" jika ingin mengirim video

  // get all informan
  const informan = await Informan.findAll({
    attributes: ["nama", "no_hp"],
    limit: 3,
    offset: 0,
  });

  // change no_hp to 62
  const phone_numbers = informan.map((data) => {
    if (data.no_hp.startsWith("0")) {
      return data.no_hp.replace("0", "62");
    }
    return data.no_hp;
  });

  // except number
  const exceptNumber = [
    "6282135922585",
    "6281328835144",
    "6282135387888",
    "6282322050123",
    "6281314943174"
  ];

  // filter phone_numbers
  const filteredPhoneNumbers = phone_numbers.filter((data) => {
    return !exceptNumber.includes(data);
  });

  // Menyimpan hasil log broadcast
  let logData = [];

  if (mediaUrl) {
    const response = await axios.get(mediaUrl, {
      responseType: "arraybuffer",
    });
    const mediaData = Buffer.from(response.data).toString("base64");
    const mimeType = response.headers["content-type"];
    const filename = mediaType === "video" ? "video.mp4" : "image.jpg";

    const media = new MessageMedia(mimeType, mediaData, filename);

    let number = 0;
    for (const phone_number of filteredPhoneNumbers) {
      number++;
      try {
        const phoneSuffix = `${phone_number}@c.us`;
        // send message
        await whatsappClient.sendMessage(phoneSuffix, media, {
          caption: message,
        });
        console.log(`Message sent to ${number} of ${phone_numbers.length}`);
        // Menyimpan log broadcast
        logData.push({ phone_number, status: "Message sent successfully" });

        // Delay between messages
        const randomDelay = Math.floor(Math.random() * 2000) + 1000;
        await delay(randomDelay);
      } catch (error) {
        console.error("Error sending message:", error);
        // Menyimpan log broadcast
        logData.push({
          phone_number,
          status: "Failed to send message",
          error: error.message,
        });
      }
    }
  } else {
    let number = 0;
    for (const phone_number of filteredPhoneNumbers) {
      number++;
      try {
        const phoneSuffix = `${phone_number}@c.us`;
        // send message
        await whatsappClient.sendMessage(phoneSuffix, message);
        console.log(`Message sent to ${number} of ${phone_numbers.length}`);
        // Menyimpan log broadcast
        logData.push({ phone_number, status: "Message sent successfully" });
        // Delay between messages
        const randomDelay = Math.floor(Math.random() * 10000) + 1000;
        await delay(randomDelay);
      } catch (error) {
        console.error("Error sending message:", error);
        // Menyimpan log broadcast
        logData.push({
          phone_number,
          status: "Failed to send message",
          error: error.message,
        });
      }
    }
  }

  // Menyimpan log broadcast ke file
  const timestamp = new Date().toISOString();
  fs.writeFileSync(
    "broadcast_log2.json",
    JSON.stringify({ timestamp, logData }, null, 2)
  );
  console.log("Log broadcast tersimpan di broadcast_log.json");

  res.send({ status: "Broadcast completed", logData });
});

export default router;
