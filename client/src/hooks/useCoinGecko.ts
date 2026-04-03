import { useState, useEffect, useCallback } from "react";

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  high_24h: number;
  low_24h: number;
  circulating_supply: number;
  sparkline_in_7d?: { price: number[] };
}

const FALLBACK_DATA: CoinMarket[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "", current_price: 84521, market_cap: 1670000000000, market_cap_rank: 1, total_volume: 28000000000, price_change_percentage_24h: 2.4, high_24h: 85200, low_24h: 82100, circulating_supply: 19600000 },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "", current_price: 1893, market_cap: 228000000000, market_cap_rank: 2, total_volume: 12000000000, price_change_percentage_24h: -1.2, high_24h: 1920, low_24h: 1860, circulating_supply: 120000000 },
  { id: "tether", symbol: "usdt", name: "Tether", image: "", current_price: 1.0, market_cap: 140000000000, market_cap_rank: 3, total_volume: 45000000000, price_change_percentage_24h: 0.01, high_24h: 1.001, low_24h: 0.999, circulating_supply: 140000000000 },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "", current_price: 612, market_cap: 89000000000, market_cap_rank: 4, total_volume: 1800000000, price_change_percentage_24h: 0.8, high_24h: 618, low_24h: 605, circulating_supply: 145000000 },
  { id: "solana", symbol: "sol", name: "Solana", image: "", current_price: 125.8, market_cap: 62000000000, market_cap_rank: 5, total_volume: 3200000000, price_change_percentage_24h: 5.1, high_24h: 128, low_24h: 119, circulating_supply: 490000000 },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "", current_price: 2.12, market_cap: 55000000000, market_cap_rank: 6, total_volume: 2100000000, price_change_percentage_24h: -0.5, high_24h: 2.18, low_24h: 2.08, circulating_supply: 57000000000 },
  { id: "usd-coin", symbol: "usdc", name: "USDC", image: "", current_price: 1.0, market_cap: 52000000000, market_cap_rank: 7, total_volume: 8000000000, price_change_percentage_24h: 0.0, high_24h: 1.001, low_24h: 0.999, circulating_supply: 52000000000 },
  { id: "cardano", symbol: "ada", name: "Cardano", image: "", current_price: 0.68, market_cap: 24000000000, market_cap_rank: 8, total_volume: 800000000, price_change_percentage_24h: 3.2, high_24h: 0.70, low_24h: 0.65, circulating_supply: 35000000000 },
  { id: "dogecoin", symbol: "doge", name: "Dogecoin", image: "", current_price: 0.165, market_cap: 24000000000, market_cap_rank: 9, total_volume: 1200000000, price_change_percentage_24h: 1.8, high_24h: 0.17, low_24h: 0.16, circulating_supply: 143000000000 },
  { id: "avalanche-2", symbol: "avax", name: "Avalanche", image: "", current_price: 22.5, market_cap: 9200000000, market_cap_rank: 10, total_volume: 450000000, price_change_percentage_24h: 4.2, high_24h: 23.1, low_24h: 21.5, circulating_supply: 410000000 },
  { id: "polkadot", symbol: "dot", name: "Polkadot", image: "", current_price: 4.25, market_cap: 6400000000, market_cap_rank: 11, total_volume: 220000000, price_change_percentage_24h: -2.1, high_24h: 4.40, low_24h: 4.15, circulating_supply: 1500000000 },
  { id: "chainlink", symbol: "link", name: "Chainlink", image: "", current_price: 13.8, market_cap: 8600000000, market_cap_rank: 12, total_volume: 520000000, price_change_percentage_24h: 1.5, high_24h: 14.1, low_24h: 13.4, circulating_supply: 620000000 },
  { id: "tron", symbol: "trx", name: "TRON", image: "", current_price: 0.24, market_cap: 21000000000, market_cap_rank: 13, total_volume: 600000000, price_change_percentage_24h: 0.3, high_24h: 0.245, low_24h: 0.235, circulating_supply: 86000000000 },
  { id: "matic-network", symbol: "matic", name: "Polygon", image: "", current_price: 0.22, market_cap: 2200000000, market_cap_rank: 14, total_volume: 180000000, price_change_percentage_24h: -1.8, high_24h: 0.23, low_24h: 0.21, circulating_supply: 10000000000 },
  { id: "shiba-inu", symbol: "shib", name: "Shiba Inu", image: "", current_price: 0.0000125, market_cap: 7400000000, market_cap_rank: 15, total_volume: 350000000, price_change_percentage_24h: 2.9, high_24h: 0.0000128, low_24h: 0.0000121, circulating_supply: 589000000000000 },
  { id: "litecoin", symbol: "ltc", name: "Litecoin", image: "", current_price: 85.2, market_cap: 6400000000, market_cap_rank: 16, total_volume: 420000000, price_change_percentage_24h: 0.6, high_24h: 86.5, low_24h: 83.8, circulating_supply: 75000000 },
  { id: "uniswap", symbol: "uni", name: "Uniswap", image: "", current_price: 6.15, market_cap: 3700000000, market_cap_rank: 17, total_volume: 110000000, price_change_percentage_24h: -0.9, high_24h: 6.30, low_24h: 6.0, circulating_supply: 600000000 },
  { id: "cosmos", symbol: "atom", name: "Cosmos", image: "", current_price: 4.52, market_cap: 1800000000, market_cap_rank: 18, total_volume: 95000000, price_change_percentage_24h: 1.1, high_24h: 4.60, low_24h: 4.40, circulating_supply: 390000000 },
  { id: "near", symbol: "near", name: "NEAR Protocol", image: "", current_price: 2.85, market_cap: 3200000000, market_cap_rank: 19, total_volume: 150000000, price_change_percentage_24h: 3.8, high_24h: 2.92, low_24h: 2.72, circulating_supply: 1100000000 },
  { id: "stellar", symbol: "xlm", name: "Stellar", image: "", current_price: 0.27, market_cap: 8100000000, market_cap_rank: 20, total_volume: 200000000, price_change_percentage_24h: -0.4, high_24h: 0.275, low_24h: 0.265, circulating_supply: 30000000000 },
];

export function useCoinGecko(perPage = 20) {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=7d`
      );
      if (res.ok) {
        const data = await res.json();
        setCoins(data);
        setError(null);
      } else {
        if (coins.length === 0) setCoins(FALLBACK_DATA.slice(0, perPage));
        setError("API rate limited — showing cached data");
      }
    } catch {
      if (coins.length === 0) setCoins(FALLBACK_DATA.slice(0, perPage));
      setError("Network error — showing cached data");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [perPage]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { coins, loading, error, lastUpdated, refetch: fetchData };
}

export function useBtcPrice() {
  const [price, setPrice] = useState(84521);
  const [change24h, setChange24h] = useState(2.4);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
        );
        if (res.ok) {
          const data = await res.json();
          setPrice(data.bitcoin.usd);
          setChange24h(data.bitcoin.usd_24h_change);
        }
      } catch {
        // keep fallback
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  return { price, change24h };
}
