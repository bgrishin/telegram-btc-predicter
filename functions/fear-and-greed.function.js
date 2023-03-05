import axios from "axios";
import "dotenv/config";

export const getFearAndGreedIndex = async () =>
  await axios.get("https://fear-and-greed-index.p.rapidapi.com/v1/fgi", {
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_TOKEN,
      "X-RapidAPI-Host": "fear-and-greed-index.p.rapidapi.com",
    },
  });
