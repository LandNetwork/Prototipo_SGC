"use strict";
require("dotenv").config();

const cron = require('node-cron');

const whatsapp = require("./whatsapp");
const pg_db = require("./db_pg");
const { notify } = require("./api");


const webpush = require('web-push');

const vapidKeys = {
    publicKey: process.env.WEB_PUSH_PUBLIC,
    privateKey: process.env.WEB_PUSH_PRIVATE
};

webpush.setVapidDetails(
    process.env.WEB_PUSH_URI,
    vapidKeys.publicKey,
    vapidKeys.privateKey
);



const checktatus = async () => {
    
}

const startMonitor = async () => {
    // This will run the function every 10 seconds.
    cron.schedule('*/10 * * * * *', checkStatus);

}

module.exports = {
    startMonitor,
}