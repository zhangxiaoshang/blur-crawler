// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, PlaywrightRequestHandler } from "crawlee";
import urls from "../config.js";

const TIMEOUT_SECS = 2147000; // Limiting the max value 2147483647

const floorPriceSelector =
  "#COLLECTION_OVERLINE > div > div.DataTableMediaLarge__StyledTable-sc-q5a38r-0.iccpbq > div:nth-child(2) > div > div > div > div.Text__TextRoot-sc-m23s7f-0.jKRaaR.cell.index-0";
const topBidSelector =
  "#COLLECTION_OVERLINE > div > div.DataTableMediaLarge__StyledTable-sc-q5a38r-0.iccpbq > div:nth-child(2) > div > div > div > div.Text__TextRoot-sc-m23s7f-0.jKRaaR.cell.index-1";

type IValueName = "floor_price" | "top_bid";
interface ITarget {
  selector: string;
  valueName: IValueName;
}

interface IResult {
  collectionName: string;
  valueName: IValueName;
  newValue: string;
  oldValue: string;
  time: number; // ms
}

const requestHandler: PlaywrightRequestHandler = async ({
  page,
  log,
  pushData,
}) => {
  const targets: ITarget[] = [
    {
      selector: floorPriceSelector,
      valueName: "floor_price",
    },
    {
      selector: topBidSelector,
      valueName: "top_bid",
    },
  ];

  await page.exposeFunction("priceChangedCallback", async (data: IResult) => {
    log.info(data.collectionName, data);
    await pushData(data);

    return data;
  });

  // wait page load
  for (const target of targets) {
    await page.waitForSelector(target.selector);
  }

  // observe target
  for (const target of targets) {
    await page.$eval(
      target.selector,
      (targetNode, valueName) => {
        const observer = new MutationObserver((mutationsList) => {
          let oldValue;
          let newValue;
          mutationsList.forEach((mutation) => {
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

          const [, , collectionName] = window.location.pathname.split("/");

          if (oldValue && newValue && collectionName) {
            const data: IResult = {
              collectionName,
              newValue,
              oldValue,
              valueName,
              // valueName: "floor_price",
              time: Date.now(),
            };

            // @ts-ignore
            window.priceChangedCallback(data);
          }
        });

        observer.observe(targetNode, { childList: true, subtree: true });
      },
      target.valueName
    );
  }

  await page.waitForTimeout(TIMEOUT_SECS * 1000);
};

const crawler = new PlaywrightCrawler({
  maxConcurrency: urls.length,
  requestHandler,
  // Comment this option to scrape the full website.
  maxRequestsPerCrawl: 20,
  // Uncomment this option to see the browser window.
  // headless: false,
  requestHandlerTimeoutSecs: TIMEOUT_SECS,
});

// Add first URL to the queue and start the crawl.
await crawler.run(urls);
