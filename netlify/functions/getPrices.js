const axios = require("axios");

exports.handler = async (event) => {
  const params = event.queryStringParameters;
  const amount = parseFloat(params.amount) || 1;
  const symbol = (params.symbol || "").toUpperCase().trim();

  if (!symbol) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing symbol parameter" }),
    };
  }

  const apiUrls = {
    Binance: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`,
    Bybit: `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}USDT`,
    KuCoin: `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol}-USDT`,
    Kraken: `https://api.kraken.com/0/public/Ticker?pair=${symbol}USDT`,
    OKX: `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`,
    Bitget: `https://api.bitget.com/api/v2/mix/market/symbol-price?productType=usdt-futures&symbol=${symbol}USDT`,
    MEXC: `https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}USDT`,
    "Gate.io": `https://api.gateio.ws/api2/1/ticker/${symbol.toLowerCase()}_usdt`,
  };

  const pricePromises = Object.entries(apiUrls).map(async ([exchange, url]) => {
    try {
      const response = await axios.get(url, { timeout: 3000 }); // 3s timeout
      const data = response.data;
      let price = null;

      switch (exchange) {
        case "Binance":
  if (data?.price) {
    price = parseFloat(data.price);
  }
  break;
        case "Bybit":
  if (data?.retCode === 0 && data?.result?.list?.length > 0) {
    price = parseFloat(data.result.list[0].lastPrice);
  }
  break;
        case "KuCoin":
          price = parseFloat(data?.data?.price);
          break;
        case "Kraken":
          const key = Object.keys(data.result)[0];
          price = parseFloat(data.result[key]?.c?.[0]);
          break;
        case "OKX":
          price = parseFloat(data?.data?.[0]?.last);
          break;
        case "Bitget":
          price = parseFloat(data?.data?.[0]?.price);
          break;
        case "MEXC":
          price = parseFloat(data?.price);
          break;
        case "Gate.io":
          price = parseFloat(data?.last);
          break;
      }

      if (price) {
        return {
          exchange,
          price,
          total: price * amount,
        };
      }
    } catch (e) {
      // silently skip if error or timeout
    }

    return null;
  });

  const resultsArray = await Promise.all(pricePromises);
  const results = resultsArray.filter(Boolean);

  if (results.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: `${symbol} not found on supported exchanges.` }),
    };
  }

  results.sort((a, b) => a.total - b.total);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol,
      amount,
      prices: results,
    }),
  };
};
