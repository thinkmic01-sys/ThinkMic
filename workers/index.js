require('dotenv').config({ path: '../backend/.env' });

console.log('Starting BullMQ Workers...');

require('./transcriptionWorker');
require('./summarizationWorker');
require('./searchWorker');
require('./reportGenWorker');

console.log('All workers registered and listening to Redis queues.');
