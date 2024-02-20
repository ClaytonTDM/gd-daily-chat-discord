const express = require("express");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const sharp = require("sharp");
const axios = require("axios");
const { Readable } = require("stream");
const gd = require("gj-boomlings-api");
const app = express();
const port = 3000;

let lastFetchTime;
let cachedLevel;
let levelId;

let error = false;
let connectedIP;

const singleIpMiddleware = (req, res, next) => {
    if (connectedIP && connectedIP !== req.ip) {
        res.status(429).send("Only one IP can be connected at a time.");
    } else {
        connectedIP = req.ip;
        next();
    }
};

app.use(express.static("public"));
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 1900,
    max: 1,
    message: { success: false },
});

app.get(
    "/comments",
    singleIpMiddleware,
  /*limiter,*/ async (req, res) => {
        let level;
        const currentTime = new Date();
        if (lastFetchTime && currentTime - lastFetchTime < 3.96e6) {
            level = cachedLevel;
        } else {
            level = await gd.getDailyLevel().catch((error) => {
                console.error("Error:", error);
                error = true;
            });
            cachedLevel = level;
            lastFetchTime = currentTime;
        }
        if (level && !error) {
            levelId = JSON.stringify(level.id);
            // const page1 = await gd.getComments(levelId, 1, 0);
            // const page2 = await gd.getComments(levelId, 2, 0);
            // const comments = page1.concat(page2);
            try {
                const response = await fetch(
                    `https://gdbrowser.com/api/comments/${levelId}?count=20&page=0&time`
                );

                if (!response.ok) {
                    console.warn(`HTTP error! status: ${response.status}`);
                    res.send({ success: false });
                    return;
                }

                const comments = await response.json();
                res.send(comments);
            } catch (error) {
                res.send({ success: false });
            }
        } else {
            res.send([
                {
                    content:
                        "either youre banned for 1h (most likely) or rob forgot to set a daily level lol",
                    ID: "0",
                    likes: 0,
                    date: "1 second ago",
                    username: "System",
                    playerID: "0",
                    accountID: "0",
                    rank: null,
                    stars: null,
                    diamonds: null,
                    coins: null,
                    userCoins: null,
                    demons: null,
                    moons: null,
                    cp: null,
                    icon: {
                        form: "icon",
                        icon: 0,
                        col1: 0,
                        col2: 0,
                        colG: null,
                        glow: false,
                    },
                    col1RGB: { r: 0, g: 0, b: 0 },
                    col2RGB: { r: 255, g: 255, b: 255 },
                    colGRGB: null,
                    levelID: "0",
                    color: "255,255,255",
                    moderator: 0,
                    results: 0,
                    pages: 0,
                    range: "0 to 0",
                },
                {
                    content: "FIRE IN THE HOLE!",
                    ID: "0",
                    likes: 0,
                    date: "1 second ago",
                    username: "RobTop",
                    playerID: "0",
                    accountID: "0",
                    rank: null,
                    stars: null,
                    diamonds: null,
                    coins: null,
                    userCoins: null,
                    demons: null,
                    moons: null,
                    cp: null,
                    icon: {
                        form: "icon",
                        icon: 420,
                        col1: 0,
                        col2: 0,
                        colG: null,
                        glow: false,
                    },
                    col1RGB: { r: 0, g: 0, b: 0 },
                    col2RGB: { r: 255, g: 255, b: 255 },
                    colGRGB: null,
                    levelID: "0",
                    color: "255,255,255",
                    moderator: 0,
                    results: 0,
                    pages: 0,
                    range: "0 to 0",
                },
            ]);
        }
    }
);

app.post("/post", singleIpMiddleware, async (req, res) => {
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

app.get("/icon", async (req, res) => {
    try {
        const icon = req.query.i;
        let url;
        if (icon && icon == "coin_0") {
            url = `https://gdbrowser.com/assets/coin.png`;
        } else if (icon && icon == "coin_1") {
            url = `https://gdbrowser.com/assets/bluecoin.png`;
        } else if (icon) {
            url = `https://gdbrowser.com/iconkit/premade/${icon}.png`;
        } else {
            res.send({ success: false });
        }

        // Fetch the image from the provided URL
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const imageBuffer = Buffer.from(response.data, "binary");

        // Resize the image to fit into a 50x50 square
        const resizedImageBuffer = await sharp(imageBuffer)
            .resize({ fit: "inside", width: 50, height: 50 })
            .png()
            .toBuffer();

        // Create a transparent canvas and paste the resized image onto it
        const canvasBuffer = await sharp({
            create: {
                width: 50,
                height: 50,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        })
            .composite([{ input: resizedImageBuffer }])
            .png()
            .toBuffer();

        // Send the resulting image back as a response
        const stream = new Readable();
        stream.push(canvasBuffer);
        stream.push(null); // Signals the end of the stream
        res.set("Content-Type", "image/png");
        stream.pipe(res);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/signin", singleIpMiddleware, limiter, async (req, res) => {
    const username = req.query.u;
    const password = req.query.p;
    try {
        await gd.blockUser("KrmaL", username, password);
    } catch (error) {
        res.send({ success: false });
        return;
    }
    gd.unblockUser("KrmaL", username, password);
    res.cookie("username", username, { httpOnly: true });
    res.cookie("password", password, { httpOnly: true });
    // send accountID too (fetch https://gdbrowser.com/api/profile/username)
    const response = await fetch(`https://gdbrowser.com/api/profile/${username}`);
    const data = await response.json();
    res.cookie("accountID", data.accountID, { httpOnly: true });
    res.send({ success: true });
});

app.get("/checksignin", async (req, res) => {
    if (req.cookies.username && req.cookies.password && req.cookies.accountID) {
        res.send({
            success: true,
            username: req.cookies.username,
            accountID: req.cookies.accountID,
        });
    } else {
        res.send({ success: false });
    }
});

app.post("/signout", async (req, res) => {
    res.clearCookie("username");
    res.clearCookie("password");
    res.send({ success: true });
});

app.post("/like", /* limiter ,*/ async (req, res) => {
    const username = req.cookies.username;
    const password = req.cookies.password;
    const accountID = req.cookies.accountID;
    const id = req.query.i;
    const like = req.query.l; // true for like, false for dislike
    if (!username || !password) {
        res.send({ success: false });
        return;
    }
    try {
        // send to gdbrowser https://gdbrowser.com/like (post request url encoded form)
        /*
            ID: 103012758; // comment id to like
            accountID: 11565305; // self explanatory
            password: password; // self explanatory
            like: 1; // 1 for like, 0 for dislike
            type: 2; // what
            extraID: 6508283; // level id
        */
        // example request
        // fetch("https://gdbrowser.com/like", {
        //     "headers": {
        //       "accept": "*/*",
        //       "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        //     },
        //     "referrer": "https://gdbrowser.com/comments/6508283",
        //     "referrerPolicy": "strict-origin-when-cross-origin",
        //     "body": "ID=103013287&accountID=11565305&password=PASSWORD&like=1&type=2&extraID=6508283",
        //     "method": "POST",
        //     "mode": "cors",
        //     "credentials": "omit"
        //   });

        // send to gdbrowser
        let response = await fetch("https://gdbrowser.com/like", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: `ID=${id}&accountID=${accountID}&password=${password}&like=${like}&type=2&extraID=${levelId}`,
        });
        let data = await response.text();
        console.log(data);
        if (data.includes("Success")) {
            res.send({ success: true });
        } else {
            res.send({ success: false });
        }
    } catch (error) {
        res.send({ success: false });
    }
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
