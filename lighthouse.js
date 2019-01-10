const puppeteer = require("puppeteer");
const lighthouse = require("lighthouse");
const { URL } = require("url");
const { writeFileSync } = require("fs");
const { USER_AGENT, NETWORK_PRESETS } = require("./constatns");
const perfConfig = {
    extends: "lighthouse:default",
    settings: {
        throttlingMethod: "devtools",
        onlyCategories: ["performance"]
    }
};

(async () => {
    const url = "https://example.com";

    // Puppeteer を headful で起動 @TODO: UAなどの設定
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
            // ネットワーク 3G にエミュレート
            await client.send("Network.emulateNetworkConditions", NETWORK_PRESETS.Regular2G);
        }
    });

    // Puppeteer が監視するイベントで接続が確立されたら Lighthouse が起動できるようにしておく
    const { lhr } = await lighthouse(url, {
        port: new URL(browser.wsEndpoint()).port,
        output: "json",
        logLevel: "info"
    });

    writeFileSync("results.json", JSON.stringify(lhr, null, 4));

    // console.log(
    //     `Lighthouse scores: ${Object.values(lhr.categories)
    //         .map(c => c.score)
    //         .join(", ")}`
    // );

    await browser.close();
})();
