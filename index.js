const args = require('command-line-args');
const fs = require('fs-extra');
const path = require('path');
const request = require('request');
const st = require('speedtest-net')({ maxTime: 12000 });
const usage = require('command-line-usage');

const stats = {};

const optionDefs = [
  {
    name: 'command',
    defaultOption: true,
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display usage',
  },
  {
    name: 'quiet',
    alias: 'q',
    type: Boolean,
    description: 'Suppress all output',
  },
  {
    name: 'start',
    description: 'Start automatic testing',
  },
  {
    name: 'stop',
    description: 'Stop automatic testing',
  }
];

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
  const filepath = path.resolve(process.env['HOME'], '.st', 'config');
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
  const token = await getToken();
  if (!token) {
    console.log('Can\'t find token in ~/.st/config.');
    process.exit(255);
  }

  st.on('data', data => {
    stats.data = data;
  });

  st.on('done', () => {
    postResults(token);
  });
};

const options = args(optionDefs);
console.log(JSON.stringify(options, null, 3));
if (options.help) {
  console.log(usage([
    {
      header: 'Options',
      optionList: optionDefs,
    }
  ]));
  process.exit(0);
}

test(options)
  .catch(err => {
    if (!options.quiet) {
      console.log(err);
    }
  });
