const fs = require('fs-extra');
const path = require('path');

let dir;
const JOB = 'job';

/**
 * Return true if job file exists, false otherwise
 */
const hasJob = async () => {
  const filepath = path.resolve(process.env['HOME'], dir, JOB);
  return await fs.exists(filepath);
};

/**
 * Save job
 * @param job
 */
const saveJob = async (job) => {
  const filepath = path.resolve(process.env['HOME'], dir, JOB);
  await fs.writeJSON(filepath, job.toString());
};

/**
 * Load job
 */
const loadJob = async () => {
  const filepath = path.resolve(process.env['HOME'], dir, JOB);
  try {
    return await fs.readJSON(filepath);
  } catch (e) {
  }
};

/**
 * Remove job
 */
const delJob = async () => {
  const filepath = path.resolve(process.env['HOME'], dir, JOB);
  await fs.remove(filepath);
};

module.exports = (d) => {
  dir = d;
  return {
    hasJob,
    saveJob,
    loadJob,
    delJob,
  };
};
