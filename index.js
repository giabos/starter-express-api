const rp = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('promise');
const express = require('express');
const app = express();


async function scrapeProfile(url) {
    console.log("--", url);
    const html = await rp(url);
    const $ = cheerio.load(html);

    const text = $('.phone-bar').text();
    const dateStr = /(à|om|op|le)\s(.*)$/.exec(text)[2];

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

app.all('/:url', async (req, res) => {
    console.dir(req.params);
    const list = await scrapeList(req.params.url);
    const resp = await Promise.all(list.map(url => scrapeProfile(url)));
    res.contentType = 'application/json';
    res.send(resp)
})
app.listen(process.env.PORT || 3000)
