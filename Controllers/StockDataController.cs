using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Collections.Concurrent;
using Newtonsoft.Json;

namespace fcStockChart.Controllers
{
    [Route("api/[controller]")]
    public class StockDataController : Controller
    {
        public StockDataController()
        {
            QueryStockData("GOOG", true);
        }

        private static ConcurrentDictionary<string, Tuple<DateTime, string, object>> stockCache = new ConcurrentDictionary<string, Tuple<DateTime, string, object>>();

        [HttpGet("AddStock")]
        public JsonResult AddStock([FromQuery]string stock)
        {
            if (!String.IsNullOrWhiteSpace(stock))
            {
                stock = stock.ToUpper();
                var res = QueryStockData(stock, true);
                if (res == null)
                {
                    return new JsonResult(new { msg = "nok" });
                }
                else
                {
                    return new JsonResult(new { msg = "ok" });
                }
            }

            // If we got this far, something failed; redisplay form.
            return new JsonResult(new { msg = "empty" });
        }


        [HttpGet("StockList")]
        public JsonResult StockList()
        {
            var filteredStocks = stockCache.Where(p => Startup.StockData.Contains(p.Key))
                                            .ToDictionary(p => p.Key, p => p.Value.Item2);
            return Json(filteredStocks);
        }

        //[HttpGet("[action]/{element}/{period}")]
        [HttpGet("QuandlData")]
        public IActionResult QuandlData([FromQuery]string stock)
        {
            var res = QueryStockData(stock, false);
            if (res == null)
                return NotFound(stock);
            else
                return Ok(res);
        }


        private object QueryStockData(string stock, bool add)
        {
            if (stockCache.ContainsKey(stock))
            {
                if (stockCache[stock].Item1 == DateTime.Now.Date)
                {
                    return stockCache[stock].Item3;
                }
            }


            //Console.WriteLine("Please enter date information. If you leave the fields in blank, the default range is 01/01/2000 - 01/01/2014");
            DateTime endDate = DateTime.Now;
            DateTime startDate = endDate.AddYears(-1);
            var apikey = Environment.GetEnvironmentVariable("QUANDL_API_KEY");

            var urlPrototype = @"https://www.quandl.com/api/v3/datasets/WIKI/{0}.json?api_key={1}&start_date={2}&end_date={3}&column_index=1";
            var url = string.Format(urlPrototype, stock, apikey, startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"));

            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = client.GetAsync(url).Result;

                if (response.IsSuccessStatusCode)
                {
                    dynamic obj = JsonConvert.DeserializeObject<dynamic>(response.Content.ReadAsStringAsync().Result);
                    stockCache.TryAdd(stock, Tuple.Create<DateTime, string, object>(DateTime.Now.Date, obj.dataset.name.ToString(),obj.dataset.data));
                    return obj.dataset.data;
                }
            }
            return null;

        }
    }

}
