'use strict';

// ----- global
let settings = {};
const FOR_ALL = {originalPattern: 'all'};

browser.runtime.onMessage.addListener(s => settings = s);

function logToUI(log) { browser.runtime.sendMessage(log); }
function console(message) { browser.runtime.sendMessage({type: 2, message}) }

function FindProxyForURL(url, host) { // The URL being accessed. The path and query components of https:// URLs are stripped. 
  switch (settings.mode) {
    // not supported at the moment
    case 'random':
    case 'roundrobin':
      return [{type: 'direct'}];

    case 'patterns':
     
      const proxyMatch = findProxyMatch(url); // |url| contains port, if any, but |host| does not.

      if (proxyMatch) {
        return [prepareSetting(url, proxyMatch.proxy, proxyMatch.pattern)];
      }
      else {
       // logToUI({type: 'log', url, timestamp: Date.now()});
        return [{type: 'direct'}];                            // default
      }

    default:
      // Use proxy "xxxx" for all URLs        // const USE_PROXY_FOR_ALL_URLS = 2;
      return [prepareSetting(url, settings.proxySettings[0], FOR_ALL)]; // the first proxy
  }
}

const schemeSet = {  // converting to meaningful terms
  all : 1,
  http: 2,
  https: 4
};

function findProxyMatch(url) {
  // note: we've already thrown out inactive settings and inactive patterns in background.js.
  // we're not iterating over them

  const [scheme, hostPort] = url.split('://');
  for (const proxy of settings.proxySettings) {
    
    // Check black patterns first
    const blackMatch = proxy.blackPatterns.find(item => 
            (item.protocols === schemeSet.all || item.protocols === schemeSet[scheme]) &&
              item.pattern.test(hostPort));
 
    //if (blackMatch) { return null; }                        // found a blacklist match, end here, use direct, no proxy
    if (blackMatch) { continue; }                             // if blacklist matched move to the next proxy

    const whiteMatch = proxy.whitePatterns.find(item =>
            (item.protocols === schemeSet.all || item.protocols === schemeSet[scheme]) &&
              item.pattern.test(hostPort));
  
    if (whiteMatch) {
			// found a whitelist match, end here
			return {proxy, pattern: whiteMatch};
		}
  }

  return null; // no black or white matches
}

const typeSet = {
  1: 'http',    // PROXY_TYPE_HTTP
  2: 'https',   // PROXY_TYPE_HTTPS
  3: 'socks',   // PROXY_TYPE_SOCKS5
  4: 'socks4',  // PROXY_TYPE_SOCKS4
  5: 'direct'   // PROXY_TYPE_NONE
};

function prepareSetting(url, proxy, matchedPattern) {

  const ret = {
    type: typeSet[proxy.type] || null, 
    host: proxy.address, 
    port: proxy.port
  };
  proxy.username && (ret.username = proxy.username);
  proxy.password && (ret.password = proxy.password);
  proxy.proxyDNS && (ret.proxyDNS = proxy.proxyDNS);

  // trim the log data to what is needed
  logToUI({
    type: 1,
    url,
    title: proxy.title,
    color: proxy.color,
    address: proxy.address,
    // Log should display whatever user typed, not our processed version.
    matchedPattern: matchedPattern.originalPattern,
    timestamp: Date.now()
  });
  return ret;
}
