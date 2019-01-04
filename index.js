const puppeteer = require("puppeteer");
const lighthouse = require("lighthouse");
const { URL } = require("url");
const { writeFileSync } = require("fs");
const perfConfig = {
    extends: "lighthouse:default",
    settings: {
        throttlingMethod: "devtools",
        onlyCategories: ["performance"]
    }
};

(async () => {
    const url = "https://www.chromestatus.com/features";

    // Use Puppeteer to launch headful Chrome and don't use its default 800x600 viewport.
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    // Wait for Lighthouse to open url, then customize network conditions.
    // Note: this will re-establish these conditions when LH reloads the page. Think that's ok....
    browser.on("targetchanged", async target => {
        const page = await target.page();

        if (page && page.url() === url) {
            // Note: can't use page.addStyleTag due to github.com/GoogleChrome/puppeteer/issues/1955.
            // Do it ourselves.
            await page.target().createCDPSession();
        }
    });

    // Lighthouse will open URL. Puppeteer observes `targetchanged` and sets up network conditions.
    // Possible race condition.
    const { lhr } = await lighthouse(
        url,
        {
            port: new URL(browser.wsEndpoint()).port,
            output: "json",
            logLevel: "info"
        },
        perfConfig
    );

    writeFileSync("results.json", JSON.stringify(lhr, null, 4));

    // console.log(
    //     `Lighthouse scores: ${Object.values(lhr.categories)
    //         .map(c => c.score)
    //         .join(", ")}`
    // );

    await browser.close();
})();
