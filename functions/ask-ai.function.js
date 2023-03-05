import https from "https";

export const askAI = (messages) =>
  new Promise((resolve, reject) =>
    https
      .request(
        {
          method: "POST",
          host: "api.openai.com",
          path: "/v1/chat/completions",
          headers: {
            Authorization: `Bearer ${process.env.OPEN_AI_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("error", reject);
          res.on("end", () => {
            const json = JSON.parse(Buffer.concat(chunks).toString());
            if (json?.error?.type) reject();
            else resolve(json?.choices?.[0]?.message?.content);
          });
        }
      )
      .on("error", reject)
      .end(
        JSON.stringify({
          model: "gpt-3.5-turbo",
          temperature: 0,
          presence_penalty: 1,
          frequency_penalty: 1.2,
          messages,
        })
      )
  );
