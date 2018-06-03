// bot.js
let Botkit = require('botkit');
let Request = require('request');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
let api = require('fixer-io-node');
let log = require('winston');
require('dotenv').config();

let controller = Botkit.facebookbot({
    //
    verify_token: process.env.verify_token,
    access_token: process.env.access_token
});
let webserver = require('./server.js')(controller);
const url = 'mongodb://localhost:27017';
const dbName = 'chatdb';
const catalogUsers = 'myUusertest';




controller.hears('(.*)', 'facebook_postback', async function (bot, message) {

    let currency1 = message.text.substring(0, 3);
    let currency = message.text;//.substring(7, 10);
    let theDate = new Date(message.timestamp);
    let dataString = theDate.toGMTString();
    log.info(currency1 + "  --------------------   " + currency);

    let result = await api.base(currency1);
    switch (currency) {
        case "EUR -> USD":
            currency1 = currency1 + " = " + result.rates.USD + " USD";
            break;
        case "USD -> PLN":
            currency1 = currency1 + " = " + result.rates.PLN + " PLN";
            break;
        case "PLN -> GBP":
            currency1 = currency1 + " = " + result.rates.GBP + " GBP";
            break;
        default:
            currency1 = currency1 + " = " + result.rates.USD + "USD";
            break;
    }

    await updateHistory(currency1, dataString, message.user);

    bot.reply(message, currency1);
    currencyButtons(message);

});

controller.hears('(.*)', 'message_received', async function (bot, message) {

    console.log("ok");
    let isUser = await findUser(message);
    if (isUser)
        currencyButtons(message);
    else if (isPhone(message.text)){
        await insertUser(message);
        currencyButtons(message);
    }
    else
        quickReplyPhonNumber(message);


});
const quickReplyPhonNumber = function (message) {

    let ID = message.user;
    let messageData = {
        recipient: {
            id: ID
        },
        message: {
            text: "To register, click on the quick reply on the phone number quick reply!",

            quick_replies: [
                {
                    "content_type": "user_phone_number"
                }
            ]
        }
    };
    Request({
            uri: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: process.env.access_token
            },
            method: 'POST',
            json: messageData

        }, function (error, response, body) {
            if (error) log.error(error);
        }
    );
}


const currencyButtons = function (message) {
    let ID = message.user;
    let messageData = {
        recipient: {
            id: ID
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "What currency are you interested in?",
                    buttons: [
                        {
                            type: "postback",
                            title: "EUR -> USD",
                            payload: "EUR -> USD"

                        }, {
                            type: "postback",
                            title: "USD -> PLN",
                            payload: "USD -> PLN"
                        }, {
                            type: "postback",
                            title: "PLN -> GBP",
                            payload: "PLN -> GBP"
                        },
                    ]
                }
            }
        }
    }
    Request({
            uri: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: process.env.access_token
            },
            method: 'POST',
            json: messageData

        }, function (error, response, body) {
            if (error) log.error(error);
        }
    );
}

function isPhone(phoneNumber) {
    let reg = /^(\+{1})([0-9]+)$/;
    if (reg.test(phoneNumber))
        return true;
    else
        return false;
};


async function findUser(message) {
    let client;

         try {
            client = await MongoClient.connect(url);
            const db = client.db(dbName);
            const collection = await db.collection(catalogUsers);
            const result = await collection.find({}).toArray();
            for (let i = 0; i < result.length; i++)
                if (result[i].userId == message.user) {
                    client.close();
                    return true;
                }
             client.close();
            return false;


    } catch (err) {
        console.log(err);
    }
}


 const insertUser = async function (numberPhon, userId, db, callback) {

     let client;
     try {
         client = await MongoClient.connect(url);
         const db = client.db(dbName);
         const collection = await db.collection(catalogUsers);
         collection.insertOne({userId: userId, numberPhone: numberPhon}, function (err, res) {
             if (err) throw err;
             log.info("++++++++++User inserted+++++++++");
         })
         client.close();
         return false;
     } catch (err) {
         log.error(err);
     }
};


const updateHistory = async function (currency, dateNow, userId) {
    let client;
    try {
        client = await MongoClient.connect(url);
        const db = client.db(dbName);
        const collection = await db.collection('userHistory');
        collection.insertOne({userId: userId, currency: currency, dataNow: dateNow}, function (err, res) {
            if (err) throw err;
            log.info("++++++++++Histori updated+++++++++");
        })
        client.close();
        return false;
    } catch (err) {
        log.error(err);
    }
};