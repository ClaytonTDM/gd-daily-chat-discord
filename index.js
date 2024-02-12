const express = require('express');
const gd = require("gj-boomlings-api");
const app = express();
const port = 3000;

let lastFetchTime = null;
let cachedLevel = null;

app.use(express.static('public'))

app.get('/comments', async (req, res) => {
    let level;
    const currentTime = new Date();
    if (lastFetchTime && ((currentTime - lastFetchTime) < 3600000)) {
        level = cachedLevel;
    } else {
        level = await gd.getDailyLevel();
        cachedLevel = level;
        lastFetchTime = currentTime;
    }
    const id = JSON.stringify(level.id);
    const page1 = await gd.getComments(id, 1, 0);
    const page2 = await gd.getComments(id, 2, 0);
    const comments = page1.concat(page2);
    res.send(comments);
    // i absolutely love how simple this is
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
