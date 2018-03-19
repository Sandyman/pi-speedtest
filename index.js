const args = require('commander');
const { exec } = require('child_process');
const fs = require('fs-extra');
const pkg = require('./package.json');
const path = require('path');
const request = require('request');
const speedtest = require('speedtest-net');

const CONFIG = 'config';
const DIR = '.st';

const { hasJob, saveJob, loadJob, delJob } = require('./job')(DIR);

const stats = {};

const options = {
  verbose: false,
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
 * Post speedtest results
 * @param token
 */
const postResults = (token) => new Promise((resolve, reject) => {
  const options = {
    url: 'https://log8rdq0jd.execute-api.us-east-1.amazonaws.com/dev/sample',
    headers: {
      'Content-Type': 'appication/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(stats),
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
const getToken = async () => {
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

  // We need a token to send results to server
  const token = await getToken();
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
    await postResults(token);
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

  const cmd = `echo 'node /home/sander/github/isp-check/index.js run' | at -m now +1 minute`;
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
 * @param f
 */
const startCmd = (n, f) => {
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
  .action(startCmd('start', startPersistent));

args
  .command('stop')
  .action(startCmd('stop', stopPersistent));

args
  .command('run')
  .action(startCmd('run', runPersistentTest));

args
  .command('test')
  .action(startCmd('test', test));

args.parse(process.argv);

options.verbose = !!args.verbose;

if (!cmdValue) {
  exit(0);
}
