const express = require('express');
const cookieParser = require('cookie-parser');
const sharp = require('sharp');
const axios = require('axios');
const { Readable } = require('stream');
const gd = require("gj-boomlings-api");
const app = express();
const port = 3000;

let lastFetchTime;
let cachedLevel;
let levelId;

let error = false;

app.use(express.static('public'))
app.use(cookieParser());

app.get('/comments', async (req, res) => {
    let level;
    const currentTime = new Date();
    if (lastFetchTime && ((currentTime - lastFetchTime) < 3600000)) {
        level = cachedLevel;
    } else {
        level = await gd.getDailyLevel()
        .catch((error) => {
            console.error('Error:', error);
            error = true;
        });
        cachedLevel = level;
        lastFetchTime = currentTime;
    }
    if (level && !error) {
        levelId = JSON.stringify(level.id);
        const page1 = await gd.getComments(levelId, 1, 0);
        const page2 = await gd.getComments(levelId, 2, 0);
        const comments = page1.concat(page2);
        res.send(comments);
    } else {
        res.send([{
            content: 'either youre banned for 1h (most likely) or rob forgot to set a daily level lol',
            playerID: 0,
            likes: 1,
            disliked: false,
            percent: 0,
            id: 1,
            age: '1 second',
            username: 'System',
            iconID: 0,
            c1: '#000000',
            c2: '#FFFFFF',
            iconType: 'coin',
            glow: true,
            accountID: 0
        },
        {
            content: 'FIRE IN THE HOLE!',
            playerID: 0,
            likes: 1,
            disliked: false,
            percent: 0,
            id: 1,
            age: '1 second',
            username: 'RobTop',
            iconID: 420,
            c1: '#000000',
            c2: '#FFFFFF',
            iconType: 'cube',
            glow: true,
            accountID: 0
        }
        ])
    }
});

app.get('/post', async (req, res) => {
    const username = req.cookies.username;
    const password = req.cookies.password;
    if (!username || !password) {
        res.send({ success: false });
        return;
    }
    const comment = req.query.c;
    try {
        await gd.uploadComment(comment, levelId, username, password);
    } catch (error) {
        res.send({ success: false });
        return;
    }
    res.send({ success: true });
});

// icon resizing

app.get('/icon', async (req, res) => {
    try {
        const icon = req.query.i;
        let url;
        if (icon.includes('cube')) {
            url = `https://gdbrowser.com/iconkit/premade/${icon.replace('cube', 'icon')}.png`;
        } else if (icon == 'coin_0') {
            url = `https://gdbrowser.com/assets/coin.png`;
        } else if (icon == 'coin_1') {
            url = `https://gdbrowser.com/assets/bluecoin.png`;
        }

        // Fetch the image from the provided URL
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary');

        // Resize the image to fit into a 50x50 square
        const resizedImageBuffer = await sharp(imageBuffer)
            .resize({ fit: 'inside', width: 50, height: 50 })
            .png()
            .toBuffer();

        // Create a transparent canvas and paste the resized image onto it
        const canvasBuffer = await sharp({
            create: {
                width: 50,
                height: 50,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite([{ input: resizedImageBuffer }])
        .png()
        .toBuffer();

        // Send the resulting image back as a response
        const stream = new Readable();
        stream.push(canvasBuffer);
        stream.push(null); // Signals the end of the stream
        res.set('Content-Type', 'image/png');
        stream.pipe(res);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/signin', async (req, res) => {
    const username = req.query.u;
    const password = req.query.p;
    try {
        await gd.blockUser('KrmaL', username, password);
    } catch (error) {
        res.send({ success: false });
        return;
    }
    gd.unblockUser('KrmaL', username, password);
    res.cookie('username', username, { httpOnly: true });
    res.cookie('password', password, { httpOnly: true });
    res.send({ success: true });
});

app.get('/checksignin', async (req, res) => {
    if (req.cookies.username && req.cookies.password) {
        res.send({ success: true, username: req.cookies.username });
    } else {
        res.send({ success: false });
    }
});

app.get('/signout', async (req, res) => {
    res.clearCookie('username');
    res.clearCookie('password');
    res.send({ success: true });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
