const rp = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('promise');
const express = require('express');
const cors = require('cors');
const app = express();

const { v1: uuidv1 } = require('uuid');
const bodyParser = require('body-parser');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite3');


app.use(cors());
//app.use(bodyParser.text());
app.use(express.text())



async function scrapeProfile(url) {
    //console.log("--", url);
    const html = await rp(url);
    const $ = cheerio.load(html);

    const text = $('.phone-bar').text();
    const dateStr = /\s+(à|om|op|le)\s(.*)$/.exec(text)[2];

    const profileImgUrl = $('.avatar-wrapper img').attr('src');

   const location = $('.article-subtitle a').first().text();

   return ({dateStr, profileImgUrl, location, url});
}

async function scrapeList(url) {
    const html = await rp(url);
    const $ = cheerio.load(html);
    const list = [];
    $('article a.avatar-item').each((i, e) => {
        list.push($(e).attr('href'));
    });
    return list;
}

app.get('/status', (req, res) => {
    res.json({ok: true});
});

app.get('/scrape', async (req, res) => {
    const list = await scrapeList(req.query.url);
    const resp = await Promise.all(list.map(url => scrapeProfile(url)));
    res.contentType = 'application/json';
    res.send(resp.filter(a => !!a.location));
})


/// key-value storage api.

app.get('/store/:id', function (req, res) {
    db.get("SELECT code FROM store where rowid="+req.params.id, (err, row) => {
        console.log(row);
        res.send(row.code);
    });
});

app.post('/store', async function (req, res) {
    db.run("CREATE TABLE if not exists store (code TEXT)");
    const stmt = db.prepare("INSERT INTO store VALUES (?) returning rowid");
    console.log(req.body)
    stmt.run(req.body, function () {
        res.json({ success: true, id: this.lastID })
    });
    stmt.finalize();
});

app.put('/store/:id', async function (req, res) {
    const stmt = db.prepare("update store set code = ? where rowid = ?");
    stmt.run(req.body, req.params.id);
    stmt.finalize();
    res.json({ success: true })
});


app.listen(process.env.PORT || 3000)
