import { neon, neonConfig } from '@neondatabase/serverless';
import dns from 'dns';
import { Agent, fetch as undiciFetch, setGlobalDispatcher } from 'undici';

// Fix for Node.js "fetch failed" — your local DNS refuses neon.tech subdomains,
// so we route those lookups through Google Public DNS (8.8.8.8).
dns.setDefaultResultOrder('ipv4first');

const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

const agent = new Agent({
  connect: {
    lookup: (hostname, options, cb) => {
      // For neon.tech hosts, use Google DNS
      if (hostname.includes('neon.tech')) {
        resolver.resolve4(hostname, (err, addresses) => {
          if (err) {
            // Fallback to default
            dns.lookup(hostname, { all: true }, cb);
            return;
          }
          cb(
            null,
            addresses.map((a) => ({ address: a, family: 4 })),
          );
        });
      } else {
        dns.lookup(hostname, { all: true }, cb);
      }
    },
  },
});

// Set the global dispatcher so ALL fetch calls use our custom DNS
setGlobalDispatcher(agent);

// ALSO tell Neon to use undici's fetch (which respects the global dispatcher)
neonConfig.fetchFunction = undiciFetch;

// Increase timeout
neonConfig.fetchConnectionTimeout = 15000;

let sql;

export function getDB() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL not set');
  }

  if (!sql) {
    const cleanUrl = url.trim().replace(/^['"]|['"]$/g, '');
    sql = neon(cleanUrl);
  }

  return sql;
}

export default (strings, ...values) => getDB()(strings, ...values);
