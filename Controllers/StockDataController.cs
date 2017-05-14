using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Collections.Concurrent;

namespace fcStockChart.Controllers
{
    [Route("api/[controller]")]
    public class StockDataController : Controller
    {
        private static ConcurrentDictionary<string, Tuple<DateTime, string[][]>> stockCache = new ConcurrentDictionary<string, Tuple<DateTime, string[][]>>();

        [HttpGet("AddStock")]
        public JsonResult AddStock([FromQuery]string stock)
        {
            if (!String.IsNullOrWhiteSpace(stock))
            {
                stock = stock.ToUpper();
                var res = QueryStockData(stock);
                if (res == null)
                {
                    return new JsonResult(new { msg = "nok" });
                }
                else
                {
                    Startup.StockData.Add(stock);
                    return new JsonResult(new { msg = "ok" });
                }
            }

            // If we got this far, something failed; redisplay form.
            return new JsonResult(new { msg = "empty" });
        }


        [HttpGet("StockList")]
        public IActionResult StockList()
        {
            return Ok(Startup.StockData.ToArray());
        }

        //[HttpGet("[action]/{element}/{period}")]
        [HttpGet("YahooData")]
        public IActionResult YahooData([FromQuery]string stock)
        {
            var res = QueryStockData(stock);
            if (res == null)
                return NotFound(stock);
            else
                return Ok(res);
        }


        private string[][] QueryStockData(string stock)
        {
            if (stockCache.ContainsKey(stock))
            {
                if (stockCache[stock].Item1 == DateTime.Now.Date)
                {
                    return stockCache[stock].Item2;
                }
            }


            //Console.WriteLine("Please enter date information. If you leave the fields in blank, the default range is 01/01/2000 - 01/01/2014");
            DateTime startDate = DateTime.Now.AddYears(-1);

            var startDay = startDate.Day;
            var startMonth = startDate.Month - 1;
            var startYear = startDate.Year;
            var finishDay = DateTime.Now.Day;
            //Console.WriteLine("Of what month? (00 = January, 11 = December)");
            var finishMonth = DateTime.Now.Month - 1;
            var finishYear = DateTime.Now.Year;

            var urlPrototype = @"http://ichart.finance.yahoo.com/table.csv?s={0}&a={1:00}&b={2:00}&c={3}&d={4:00}&e={5:00}&f={6}&g={7}&ignore=.csv";
            var url = string.Format(urlPrototype, stock, startMonth, startDay, startYear, finishMonth, finishDay, finishYear, "d");

            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = client.GetAsync(url).Result;
                string data = response.Content.ReadAsStringAsync().Result;

                if (response.IsSuccessStatusCode)
                {
                    var rows = Regex.Split(data, "\r\n|\r|\n").Skip(1).Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Split(',')).ToArray();
                    stockCache.TryAdd(stock, Tuple.Create<DateTime, string[][]>(DateTime.Now.Date, rows));
                    return rows;
                }
            }
            return null;

        }
    }
}
