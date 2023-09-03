const puppeteer = require('puppeteer')
const express = require('express')
const app = express()


async function scrape() {
   const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox']})
   const page = await browser.newPage()

   await page.goto('test');

    
   const element = await page.waitForSelector(".phone-bar");
   const text = await page.evaluate(element => element.textContent, element)
   const dateStr = /(à|op)\s(.*)$/.exec(text)[2];


   const imgElement = await page.waitForSelector(".avatar-wrapper img");
   const profileImgUrl = await page.evaluate(element => element.src, imgElement)



   
   console.log(text)


   browser.close()

   return ({dateStr, profileImgUrl});
}

app.all('/', async (req, res) => {
    console.log("Just got a request!")
    const resp = await scrape();
    res.contentType = 'application/json';
    res.send(resp)
})
app.listen(process.env.PORT || 3000)
