// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, PlaywrightRequestHandler } from "crawlee";

const requestHandler: PlaywrightRequestHandler = async ({ page, log }) => {
  const selector =
    "#COLLECTION_OVERLINE > div > div.DataTableMediaLarge__StyledTable-sc-q5a38r-0.iccpbq > div:nth-child(2) > div > div > div > div.Text__TextRoot-sc-m23s7f-0.jKRaaR.cell.index-0";
  await page.waitForSelector(selector);

  await page.exposeFunction(
    "priceChangedCallback",
    (newValue: string, oldValue: string, name: "floor_price" | "top_bid") => {
      console.log({ newValue, oldValue, name });
    }
  );

  await page.$eval(selector, (targetNode) => {
    const observer = new MutationObserver((mutationsList) => {
      console.log("mutationsList", mutationsList);
      let oldValue;
      let newValue;
      mutationsList.forEach((mutation) => {
        console.log("mutation", mutation);
        switch (mutation.type) {
          case "childList":
            if (mutation.removedNodes.length > 0) {
              oldValue = mutation.removedNodes[0].textContent;
            }
            if (mutation.addedNodes.length > 0) {
              newValue = mutation.addedNodes[0].textContent;
            }
            break;
        }
      });
      if (oldValue && newValue) {
        console.log("oldValue", oldValue, "newValue", newValue);
        // @ts-ignore
        window.priceChangedCallback(oldValue, newValue, "unknow");
      }
    });

    const config = { childList: true, subtree: true };

    observer.observe(targetNode, config);
  });

  await page.waitForTimeout(3600 * 1000 * 24 * 7);
};

const crawler = new PlaywrightCrawler({
  requestHandler,
  // Comment this option to scrape the full website.
  maxRequestsPerCrawl: 20,
  // Uncomment this option to see the browser window.
  headless: false,
  requestHandlerTimeoutSecs: 2147000, // Limiting the max value 2147483647
});

// Add first URL to the queue and start the crawl.
await crawler.run(["https://blur.io/collection/azuki/bids"]);
