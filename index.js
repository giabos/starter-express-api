const rp = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('promise');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());


async function scrapeProfile(url) {
    console.log("--", url);
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
app.listen(process.env.PORT || 3000)
