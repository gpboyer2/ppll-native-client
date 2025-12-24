/**
 * BTC Futures Open Interest Crawler
 * node index.js
 */
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const UserAgent = require('user-agents');
const { HttpsProxyAgent } = require('https-proxy-agent');

const url = 'https://www.gate.com/zh/crypto-market-data/funds/futures-open-interest/btc';
const proxy = 'http://127.0.0.1:7890';

// 简单反爬：随机 UA + 可选代理
const client = axios.create({
    headers: {
        'User-Agent': new UserAgent().toString(),
        'Accept-Language': 'zh-CN,zh;q=0.9'
    },
    timeout: 10000,
    proxy: {
        protocol: 'http',
        host: '127.0.0.1',
        port: 7890
    }
});

(async () => {
    try {
        const { data: html } = await client.get(url);
        const $ = cheerio.load(html);

        // 页面只有一个 table，直接定位
        const rows = $('table tbody tr').toArray();

        const result = rows.map(tr => {
            const $td = $(tr).find('td');
            const exchangeRaw = $td.eq(0).text().trim(); // 例："G\nGate永续"
            const [abbr, name] = exchangeRaw.split('\n');
            return {
                exchangeAbbr: abbr,
                exchangeName: name,
                openInterest: $td.eq(1).text().trim(),
                change24h: $td.eq(2).text().trim()
            };
        });
        const perpetualRows = result.filter(r => r.exchangeAbbr.includes('永续'));
        console.log(JSON.stringify(perpetualRows, null, 2));
        // console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('抓取失败：', e.message);
    }
})();