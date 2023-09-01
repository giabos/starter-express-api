const rp = require('request-promise');
const cheerio = require('cheerio');
const express = require('express');
const app = express();


async function scrape() {

   const html = await rp('https://www.redlights.be/prive-ontvangst/dames/porno-babe.html');
   const $ = cheerio.load(html);

   const text = $('.phone-bar').text();
   const dateStr = /(à|om)\s(.*)$/.exec(text)[2];


   const profileImgUrl = $('.avatar-wrapper img').attr('src');

   return ({dateStr, profileImgUrl});
}

app.all('/', async (req, res) => {
    console.log("Just got a request!")
    const resp = await scrape();
    res.contentType = 'application/json';
    res.send(resp)
})
app.listen(process.env.PORT || 3000)
