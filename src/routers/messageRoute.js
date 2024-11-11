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

router.post("/message", async (req, res) => {

  const message = "Semangat siang! 🔥 Mari sebagai relawan penggerak udara, mari kita bantu sebarkan konten-konten berikut. Andika- Hendi Menang Mutlak!";

  // Memuat file video langsung dari path
  const videoMedia = MessageMedia.fromFilePath('./src/assets/video/2.mp4'); // Sesuaikan dengan path file Anda

  // get all informan
  const informan = await Informan.findAll({
    attributes: ["nama", "no_hp"],
    limit: 150,
    offset: 200,
  });

  // change no_hp to 62
  const phone_numbers = informan.map((data) => {
    if (data.no_hp.startsWith("0")) {
      return data.no_hp.replace("0", "62");
    }
    return data.no_hp;
  });

  // except number
  const exceptNumber = ["6282135922585"];

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

router.post("/broadcast", async (req, res) => {
  const { message, mediaUrl, mediaType } = req.body;

  // get all informan
  const informan = await Informan.findAll({
    attributes: ["nama", "no_hp"],
    limit: 5,
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
  const exceptNumber = ["6282135922585"];

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
        const randomDelay = Math.floor(Math.random() * 3000) + 1000;
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
    for (const phone_number of filteredPhoneNumbers) {
      try {
        const phoneSuffix = `${phone_number}@c.us`;
        // send message
        await whatsappClient.sendMessage(phoneSuffix, message);
        // Menyimpan log broadcast
        logData.push({ phone_number, status: "Message sent successfully" });

        // Delay between messages
        const randomDelay = Math.floor(Math.random() * 3000) + 1000;
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
