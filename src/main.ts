// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from "crawlee";

async function extractData(url, page) {
  const [, name] = url.match(/\/blur\.io\/collection\/(.+)\/bids/);
  const floorPrice = await page
    .locator(
      "#COLLECTION_OVERLINE > div > div.DataTableMediaLarge__StyledTable-sc-q5a38r-0.iccpbq > div:nth-child(2) > div > div > div > div.Text__TextRoot-sc-m23s7f-0.jKRaaR.cell.index-0 > div > div.Text__TextRoot-sc-m23s7f-0.bIEDDj"
    )
    .textContent();
  const bid_0 = await page
    .locator(
      "#CollectionBuy > div:nth-child(3) > div:nth-child(2) > div > div:nth-child(2) > div > div > div.row.row-0 > div.Text__TextRoot-sc-m23s7f-0.jKRaaR.cell.index-0 > div > div:nth-child(2) > div.Text__TextRoot-sc-m23s7f-0.jqBJiL"
    )
    .textContent();

  return { name, floorPrice, bid_0 };
}

const crawler = new PlaywrightCrawler({
  // Use the requestHandler to process each of the crawled pages.
  async requestHandler({ request, page, enqueueLinks, log, pushData }) {
    let lastFloorPrice = "";
    let lastBid_0 = "";

    async function extractAndCheck() {
      const { name, floorPrice, bid_0 } = await extractData(
        request.loadedUrl,
        page
      );

      if (lastFloorPrice !== floorPrice || lastBid_0 !== bid_0) {
        lastFloorPrice = floorPrice;
        lastBid_0 = bid_0;

        log.info(`${name} floor price ${floorPrice}`);
        log.info(`${name} bid_0  ${bid_0}`);

        // Save results as JSON to ./storage/datasets/default
        await pushData({
          name,
          floorPrice,
          bid_0,
          date: new Date().toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
          }),
        });
      } else {
        // log.info(`no change`);
      }
    }

    while (true) {
      await page.waitForTimeout(50);
      await extractAndCheck();
    }
  },
  // Comment this option to scrape the full website.
  maxRequestsPerCrawl: 20,
  // Uncomment this option to see the browser window.
  headless: false,
});

// Add first URL to the queue and start the crawl.
await crawler.run(["https://blur.io/collection/azuki"]);
