const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  const { symbol, amount = 1 } = event.queryStringParameters;
  const upperSymbol = symbol?.toUpperCase();

  if (!upperSymbol) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'symbol' parameter." }),
    };
  }

  const quantity = parseFloat(amount) || 1;

  const EXCHANGES = {
    Binance: {
      url: (s) => `https://api.binance.com/api/v3/ticker/price?symbol=${s}USDT`,
      parser: (data) => parseFloat(data.price),
    },
    Bybit: {
      url: (s) => `https://api.bybit.com/v2/public/tickers?symbol=${s}USDT`,
      parser: (data) => parseFloat(data.result[0].last_price),
    },
    MEXC: {
      url: (s) => `https://api.mexc.com/api/v3/ticker/price?symbol=${s}USDT`,
      parser: (data) => parseFloat(data.price),
    },
    Gateio: {
      url: (s) => `https://api.gateio.ws/api2/1/ticker/${s.toLowerCase()}_usdt`,
      parser: (data) => parseFloat(data.last),
    },
    Bitget: {
      url: (s) => `https://api.bitget.com/api/v2/mix/market/symbol-price?productType=usdt-futures&symbol=${s}USDT`,
      parser: (data) => parseFloat(data.data[0].price),
    },
    OKX: {
      url: (s) => `https://www.okx.com/api/v5/market/ticker?instId=${s}-USDT`,
      parser: (data) => parseFloat(data.data[0].last),
    },
    KuCoin: {
      url: (s) => `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${s}-USDT`,
      parser: (data) => parseFloat(data.data.price),
    },
    Kraken: {
      url: (s) => `https://api.kraken.com/0/public/Ticker?pair=${s}USDT`,
      parser: (data) => {
        const key = Object.keys(data.result)[0];
        return parseFloat(data.result[key].c[0]);
      },
    },
  };

  const promises = Object.entries(EXCHANGES).map(async ([name, config]) => {
    try {
      const res = await fetch(config.url(upperSymbol));
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const price = config.parser(data);
      if (!price) throw new Error("No price");
      return { exchange: name, price, total: price * quantity };
    } catch (err) {
      return null;
    }
  });

  const results = await Promise.all(promises);
  const valid = results.filter((item) => item !== null);

  if (valid.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "No prices found for symbol." }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      symbol: upperSymbol,
      amount: quantity,
      prices: valid.sort((a, b) => a.total - b.total),
    }),
  };
};
