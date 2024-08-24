import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";// Make sure to import axios

const app = express();
const port = 3001;
const processedVideos = new Set();

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "cerebrodb",
  password: "Sanny_PostgreSQL@123",
  port: 5432,
});

db.connect()
  .then(() => console.log("Successfully connected to database."))
  .catch((err) => console.error("Error while connecting to database:", err));

app.use(cors());
app.use(bodyParser.json());

function getYouTubeVideoId(ytLink) {
  let ytId;
  if (ytLink.includes("&")) {
    ytId = ytLink.split("&")[0].split("=")[1];
  } else {
    ytId = ytLink.split("=")[1];
  }
  console.log(ytId);
  return ytId;
}

app.post('/api/videolink', async (req, res) => {
  const { videoLink } = req.body;
  console.log('Received video link:', videoLink);
  
  try {
    const videoId = getYouTubeVideoId(videoLink);
    console.log(videoId);
    if (processedVideos.has(videoId)) {
      console.log("Video already processed. Skipping.");
      return res.json({ message: 'Video already processed. Flashcards are available.' });
    }

    const response = await axios.get(`https://dc76-35-189-174-69.ngrok-free.app/${videoId}`);
    
    const flashCards = response.data;
    for (let card of flashCards) {
      const { heading, paragraph } = card;
      await db.query(
        "INSERT INTO flash_card (heading, paragraph) VALUES ($1, $2)",
        [heading, paragraph]
      );
    }
    console.log("Flashcards fetched and inserted successfully!");
    processedVideos.add(videoId);
    res.json({ message: 'Video link received and flashcards inserted successfully' });
  } catch (err) {
    console.error("Error fetching and inserting flashcard data:", err.stack);
    res.status(500).send("Error fetching and inserting flashcard data");
  }
});

app.get("/flashcard", async (req, res) => {
  try {
    let allCards = await db.query("SELECT * FROM flash_card");
    res.json(allCards.rows);
  } catch (err) {
    console.error("Error fetching data from database:", err.stack);
    res.status(500).send("Error fetching data from database");
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});