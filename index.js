const fs = require('fs-extra');
const path = require('path');
const request = require('request');
const st = require('speedtest-net')({ maxTime: 12000 });

const stats = {};

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
  return await fs.readJson(filepath);
};

/**
 * Upload results
 */
const uploadResults = async () => {
  const token = await getToken();
  if (token) postResults(token);
};

st.on('data', data => {
  stats.data = data;
});

st.on('done', () => {
  uploadResults();
});

st.on('error', err => {
  stats.error = err;
  uploadResults();
});
