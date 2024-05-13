const rp = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('promise');
const express = require('express');
const cors = require('cors');
const app = express();

const { v1: uuidv1 } = require('uuid');
const bodyParser = require('body-parser');

const AWS = require("aws-sdk");
const s3 = new AWS.S3()

app.use(cors());
app.use(bodyParser.text());


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

app.get('/store/:id', async function (req, res) {
    const result = await s3.getObject({
        Bucket: "cyclic-hilarious-jay-coveralls-eu-west-1",
        Key: req.params.id,
    }).promise()
    res.send(result.Body.toString('utf-8'));
});


app.post('/store', async function (req, res) {
    const key = uuidv1();
    await s3.putObject({
        Body: req.body,
        Bucket: "cyclic-hilarious-jay-coveralls-eu-west-1",
        Key: key,
    }).promise()
    res.json({ success: true, id: key })
});

app.put('/store/:id', async function (req, res) {
    await s3.putObject({
        Body: req.body,
        Bucket: "cyclic-hilarious-jay-coveralls-eu-west-1",
        Key: req.params.id,
    }).promise()
    res.json({ success: true })
});


app.listen(process.env.PORT || 3000)
