using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SpaServices.Webpack;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net.WebSockets;
using Microsoft.AspNetCore.Http;
using System.Threading;
using Newtonsoft.Json;
using System.Text;
using System.Collections;
using System.Collections.Concurrent;

namespace fcStockChart
{
    public class Startup
    {
        public static Dictionary<string, string> StockData = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { { "GOOG", "Alphabet Inc (GOOG) Prices, Dividends, Splits and Trading Volume" } };
        private static ConcurrentDictionary<string, WebSocket> _sockets = new ConcurrentDictionary<string, WebSocket>();

        public Startup(IHostingEnvironment env)
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(env.ContentRootPath)
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
                .AddEnvironmentVariables();
            Configuration = builder.Build();
        }

        public IConfigurationRoot Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Add framework services.
            services.AddMvc();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            loggerFactory.AddConsole(Configuration.GetSection("Logging"));
            loggerFactory.AddDebug();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseWebpackDevMiddleware(new WebpackDevMiddlewareOptions {
                    HotModuleReplacement = true
                });
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
            }

            app.UseStaticFiles();

 #region UseWebSockets
            var webSocketOptions = new WebSocketOptions()
            {
                KeepAliveInterval = TimeSpan.FromSeconds(120),
                ReceiveBufferSize = 4 * 1024
            };
            app.UseWebSockets(webSocketOptions);

            app.Use(async (context, next) =>
            {
                if (context.Request.Path == "/ws")
                {
                    if (context.WebSockets.IsWebSocketRequest)
                    {
                        WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
                        var socketId = Guid.NewGuid().ToString();
                        _sockets.TryAdd(socketId, webSocket);

                        await Echo(context, webSocket);

                        WebSocket dummy;
                        _sockets.TryRemove(socketId, out dummy);

                        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                        webSocket.Dispose();
                    }
                    else
                    {
                        context.Response.StatusCode = 400;
                    }
 
                }
                else
                {
                    await next();
                }
            });
#endregion
            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");

                routes.MapSpaFallbackRoute(
                    name: "spa-fallback",
                    defaults: new { controller = "Home", action = "Index" });
            });
        }

        #region Echo
        private async Task Echo(HttpContext context, WebSocket webSocket)
        {
            try
            {
            var buffer = new byte[1024 * 4];
            WebSocketReceiveResult result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            while (!result.CloseStatus.HasValue)
            {
                var stocks = JsonConvert.DeserializeObject<string[]>(Encoding.UTF8.GetString(buffer,0,result.Count));
                var filteredStocks = StockData.Where(p => stocks.Contains(p.Key))
                                            .ToDictionary(p => p.Key, p => p.Value);
                var resp = System.Text.Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(filteredStocks));

                foreach (var socket in _sockets)
                {
                    if (socket.Value.State != WebSocketState.Open)
                    {
                        continue;
                    }

                    await socket.Value.SendAsync(new ArraySegment<byte>(resp, 0, resp.Length), result.MessageType, result.EndOfMessage, CancellationToken.None);
                }

                result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            await webSocket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
            }
            catch (System.Exception ex)
            {
                
                throw;
            }
        }
        #endregion
    }
}
