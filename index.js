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
app.use(express.text());

const dummyImg =
    'https://img.freepik.com/free-photo/purple-osteospermum-daisy-flower_1373-16.jpg';

async function scrapeProfile(url) {
    //console.log("--", url);
    const html = await rp(url);
    const $ = cheerio.load(html);

    const text = $('.phone-bar').text();
    const dateStr = /\s+(à|om|op|le)\s(.*)$/.exec(text)[2];
    const profileImgUrl = $('.avatar-wrapper img').attr('src');
    const location = $('.article-subtitle a').first().text();
    const isSafe = $('[class*="label-safe"]').length > 0;

    return { dateStr, profileImgUrl, location, url, isSafe };
}

async function scrapeTitle(url) {
    const html = await rp(url);
    const $ = cheerio.load(html);
    const location = $('title').text();
    return { dateStr: '-', profileImgUrl: dummyImg, location, url };
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

async function scrapeAll(url) {
    const list = await scrapeList(url);
    const resp = await Promise.all(list.map((url) => scrapeProfile(url)));
    return resp.filter((a) => !!a.location);
}


app.get('/status', (req, res) => {
    res.json({ ok: true });
});

app.get('/scrape', async (req, res) => {
    const result = await scrapeAll(req.query.url);
    const allFromToday = result.every(a => /^\d{2}:\d{2}\s*$/.test(a.dateStr));
    if (allFromToday) {
      // if page1 all from today also scrape page2
      const list2 = await scrapeAll(req.query.url + "&page=2");
      result.push(...list2);
    }
    res.contentType = 'application/json';
    res.send(result);
});

app.get('/scrape-one', async (req, res) => {
    try {
        const data = await scrapeProfile(req.query.url);
        res.json(data);
    } catch (e) {
        try {
            // fetch only page title with url.
            res.json(await scrapeTitle(req.query.url));
        } catch (e2) {
            res.json({
                dateStr: '-',
                profileImgUrl: dummyImg,
                location: '-',
                url: req.query.url,
            });
        }
    }
});

/// key-value storage api.

app.get('/store/:id', function (req, res) {
    db.get(
        'SELECT code FROM store where rowid=' + req.params.id,
        (err, row) => {
            res.send(row.code);
        }
    );
});

app.post('/store', async function (req, res) {
    db.run('CREATE TABLE if not exists store (code TEXT)');
    const stmt = db.prepare('INSERT INTO store VALUES (?) returning rowid');
    stmt.run(req.body, function () {
        res.json({ success: true, id: this.lastID });
    });
    stmt.finalize();
});

app.put('/store/:id', async function (req, res) {
    const stmt = db.prepare('update store set code = ? where rowid = ?');
    stmt.run(req.body, req.params.id);
    stmt.finalize();
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
