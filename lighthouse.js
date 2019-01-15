const puppeteer = require("puppeteer");
const lighthouse = require("lighthouse");
const { URL } = require("url");
const crypto = require("crypto");
const timestamp = Date.now();
const { writeFileSync } = require("fs");
const { USER_AGENT } = require("./constants");
const perfConfig = {
    extends: "lighthouse:default",
    settings: {
        // throttlingMethod: "devtools", // default: "simulate", and other "devtools"
        maxWaitForLoad: 60000
    }
};

const digestChunk = crypto
    .createHash("sha1")
    .update(String(timestamp))
    .digest("hex")
    .slice(0, 8);

const [key, value] = process.argv[2].split("=");
if (typeof value === undefined || key !== "--url") {
    console.error("[warn] invalid arguments");
    process.exit(1);
}

const url = `${value}?type=${digestChunk}`;

(async () => {
    // Puppeteer を headful で起動
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    // Lighthouse が接続せれるまで待つためにイベントをオブザーブ
    browser.on("targetchanged", async target => {
        const page = await target.page();
        // UserAgent をエミュレート
        await page.emulate(USER_AGENT["Nexus 5"]);

        if (page && page.url() === url) {
            const client = await page.target().createCDPSession();
            // await client.send("Network.emulateNetworkConditions", NETWORK_PRESETS.Regular2G);
        }
    });

    // Puppeteer が監視するイベントで接続が確立されたら Lighthouse が起動できるようにしておく
    const { lhr } = await lighthouse(
        url,
        {
            port: new URL(browser.wsEndpoint()).port,
            output: "json",
            logLevel: "info"
        },
        perfConfig
    );

    const { items } = lhr.audits.metrics.details;

    const result = {
        TTFB: Math.round(lhr.audits["time-to-first-byte"].rawValue),
        FCP: items[0].firstContentfulPaint,
        FMP: items[0].firstMeaningfulPaint,
        speedindex: items[0].speedIndex,
        interactive: items[0].interactive, // = onload
        FirstPaint: items[0].observedFirstPaint
    };

    console.log(JSON.stringify(result, null, 4));

    writeFileSync(`${timestamp}_${encodeURIComponent(value)}.json`, JSON.stringify(result, null, 4));
    writeFileSync(`${timestamp}_lhr_${encodeURIComponent(value)}.json`, JSON.stringify(lhr, null, 4));

    await browser.close();
})();
