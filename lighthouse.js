const puppeteer = require("puppeteer");
const lighthouse = require("lighthouse");
const { URL } = require("url");
const { writeFileSync } = require("fs");
const { USER_AGENT } = require("./constants");
const perfConfig = {
    extends: "lighthouse:default",
    settings: {
        throttlingMethod: "simulate", // default: "simulate", and other "devtools"
        throttling: {
            rttMs: 150,
            throughputKbps: 1.6 * 1024,
            requestLatencyMs: 150,
            downloadThroughputKbps: 1.6 * 1024,
            uploadThroughputKbps: 750,
            cpuSlowdownMultiplier: 4
        }
    }
};

(async () => {
    const url = "";

    // Puppeteer を headful で起動
    const browser = await puppeteer.launch({
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

    writeFileSync("results.json", JSON.stringify(lhr, null, 4));

    // console.log(
    //     `Lighthouse scores: ${Object.values(lhr.categories)
    //         .map(c => c.score)
    //         .join(", ")}`
    // );

    await browser.close();
})();
