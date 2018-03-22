#!/usr/bin/env node
const args = require('commander');
const { exec } = require('child_process');
const fs = require('fs-extra');
const pkg = require('./package.json');
const path = require('path');
const request = require('request');
const speedtest = require('speedtest-net');

const API_ENDPOINT = 'https://api.pi-speedtest.net';
const API_VERSION = 'v1';
const CONFIG = 'config';
const DIR = '.st';

const { hasJob, saveJob, loadJob, delJob } = require('./job')(DIR);

const stats = {};

const options = {
  verbose: false,
  runNow: false,
};

/**
 * Log depending on status of verbose flag
 * @param s
 */
const log = (s) => {
  if (options.verbose) console.log(s);
};

/**
 * Convenience function
 * @param n
 */
const exit = (n) => process.exit(n);

/**
 * We're not interested in all stats
 */
const mapStats = () => {
  const { speeds, client, server } = stats.data;
  return {
    data: {
      speeds: {
        download: speeds.download,
        upload: speeds.upload,
      },
      client: {
        isp: client.isp,
      },
      server: {
        cc: server.cc,
        country: server.country,
        id: server.id,
        location: server.location,
        ping: server.ping,
      }
    }
  };
};

/**
 * Test API endpoint
 */
const testApiEndpoint = () => new Promise((resolve, reject) => {
  const options = {
    url: `${API_ENDPOINT}/${API_VERSION}/sample`,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  request.options(options, (err, response, body) => {
    if (err) return reject(err);
    if (response.statusCode !== 200) return reject(new Error(`code ${response.statusCode}`));

    return resolve();
  });
});

/**
 * Post speedtest results
 * @param token
 */
const postResults = (token) => new Promise((resolve, reject) => {
  const options = {
    url: `${API_ENDPOINT}/${API_VERSION}/sample`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(mapStats()),
  };
  request.post(options, (err, response, body) => {
    if (err) return reject(err);
    if (response.statusCode !== 200) return reject(new Error(`code ${response.statusCode}`));

    return resolve();
  });
});

/**
 * Get token from storage
 */
const tokenRead = async () => {
  const filepath = path.resolve(process.env['HOME'], DIR, CONFIG);
  try {
    return await fs.readJson(filepath);
  } catch (e) {
    return null;
  }
};

/**
 * Run the test
 */
const test = async () => {
  log('Run test');

  try {
    await testApiEndpoint();
  } catch (e) {
    log(e);
    await stopPersistent();
    exit(255);
  }

  // We need a token to send results to server
  const token = await tokenRead();
  if (!token) {
    console.log(`Can't find token in ~/${DIR}/${CONFIG}.`);
    exit(255);
  }

  // Create speedtest object and connect event handlers
  const st = speedtest({ maxTime: 12000 });
  st.on('data', data => {
    stats.data = data;
  });
  st.on('done', async () => {
    try {
      await postResults(token);
      log(JSON.stringify(stats.data, null, 3));
    } catch (e) {
      log(e);
    }
  });
};

/**
 * Start persistent testing
 */
const startPersistent = async () => {
  log('Start persistent');

  if (await hasJob()) {
    console.log(`Already started.`);
    exit(255);
  }

  try {
    await testApiEndpoint();
  } catch (e) {
    log(e);
    exit(255);
  }

  const cmd = `echo 'pi-speedtest run' | at now +3 hours`;
  exec(cmd, async (err, stdout, stderr) => {
    try {
      const job = stderr
        .trim()
        .replace('\n', ' ')
        .match(/^.*(job\s+(\d+)\s).*$/)[2];

      log(`New job ${job}`);

       await saveJob(job);
    } catch (e) {
    }
  });

  // Let's run the first test immediately
  if (options.runNow) {
    await test();
  }
};

/**
 * Stop persistent testing
 */
const stopPersistent = async () => {
  log('Stop persistent');

  if (await hasJob()) {
    const job = await loadJob();
    await delJob();
    const cmd = `atrm ${job}`;
    exec(cmd, () => {
      log(`Removed job ${job}`);
    });
  } else {
    console.log('Nothing to stop.');
  }
};

/**
 * Remove job, start persistent, and run test
 */
const runPersistentTest = async () => {
  if (await hasJob()) {
    await delJob();
  }
  await test();
  await startPersistent();
};

/**
 * Convenience function
 * @param n
 * @param parent
 */
const startCmd = (n, { parent }) => f => {
  options.verbose = !!parent.verbose;
  cmdValue = n;
  return f;
};

let cmdValue;

args
  .version(pkg.version, '-v, --version')
  .option('-q, --quiet', 'Suppress all output')
  .option('-V, --verbose', 'Show verbose output');

args
  .command('start')
  .option('-r, --run-now', 'Run immediate test upon start')
  .action(cmd => {
    options.runNow = !!cmd.runNow;
    return startCmd('start', cmd)(startPersistent)();
  });

args
  .command('stop')
  .action(cmd => startCmd('stop', cmd)(stopPersistent)());

args
  .command('run')
  .action(cmd => startCmd('run', cmd)(runPersistentTest)());

args
  .command('test')
  .action(cmd => startCmd('test', cmd)(test)());

args.parse(process.argv);

options.verbose = !!args.verbose;

if (!cmdValue) {
  exit(0);
}
