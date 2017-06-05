FROM microsoft/aspnetcore
WORKDIR /app
COPY ./app .
CMD ASPNETCORE_URLS=http://*:$PORT dotnet fcStockChart.dll
