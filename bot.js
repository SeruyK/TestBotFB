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


const insertUser = function (numberPhon, userId, db, callback) {
    const collection = db.collection('users');
    collection.insertOne({userId: userId, numberPhone: numberPhon}, function (err, res) {
        if (err) throw err;
        log.info("++++++++++User inserted+++++++++");

    })
};

const updateHistory = function (currency, dateNow, userId, db, callback) {
    const collection = db.collection('userHistory');
    collection.insertOne({userId: userId, currency: currency, dataNow: dateNow}, function (err, res) {
        if (err) throw err;
        log.info("++++++++++Histori updated+++++++++");
    })
};


function findUser(messageText, userid, db, callback) {

    const collection = db.collection('users');
    collection.find({}).toArray(function (err, docs) {
        assert.equal(err, null);
        let isUser = false;

        docs.forEach(function (item) {
            if (item.userId != userid) {
                isUser = true;
            }
        });
        if (!isUser) {
            let reg = /^(\+{1})([0-9]+)$/;
            if (reg.test(messageText)) {
                insertUser(messageText, userid, db, function () {
                });
                isUser = true;
            }
        }

        callback(isUser);
    });

}

controller.hears('(.*)', 'facebook_postback', function (bot, message) {

    let currency1 = message.text.substring(0, 3);
    let currency = message.text;//.substring(7, 10);
    let theDate = new Date(message.timestamp);
    let dataString = theDate.toGMTString();
    log.info(currency1+"  --------------------   "+currency);
    api.base(currency1).then(function (result) {
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
        MongoClient.connect(url, function (err, client) {
            assert.equal(null, err);
            log.info("Connected successfully to server");
            const db = client.db(dbName);
            updateHistory(currency1, dataString, message.user, db, function () {
            });
            client.close();
        });

        bot.reply(message, currency1);
        currencyButtons(message);
    }).catch(function (error) {
        log.error(error)
    })

});

controller.hears('Show ', 'message_received', function (bot, message) {
    let currency = message.text.substring(5, 8);
    log.info(currency);
    let theDate = new Date(message.timestamp);
    let dataString = theDate.toGMTString();
    api.base('USD').then(function (result) {
        switch (currency.toLowerCase()) {
            case "eur":
                currency = currency + " = " + result.rates.EUR + " USD";
                break;
            case "gbp":
                currency = currency + " = " + result.rates.GBP + " GBP";
                break;
            case "pln":
                currency = currency + " = " + result.rates.PLN + " USD";
                break;
            default:
                currency = currency + " = " + result.rates.USD + "USD";
                break;
        }
        MongoClient.connect(url, function (err, client) {
            assert.equal(null, err);
            log.info("Connected successfully to server");
            const db = client.db(dbName);
            updateHistory(currency, dataString, message.user, db, function () {
            });
            client.close();
        });

        bot.reply(message, currency);
        currencyButtons(message);
    }).catch(function (error) {
        log.error(error)
    })
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
            // Виводить валюти через  quick reply
            //---------------------------------------------------
            //     text: "What currency are you interested in?",
            //     quick_replies: [
            //         {
            //             content_type: 'text',
            //             title: 'Show EUR',
            //             payload: 'DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED',
            //         },
            //         {
            //             content_type: 'text',
            //             title: 'Show PLN',
            //             payload: 'DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED',
            //         },
            //         {
            //             content_type: 'text',
            //             title: 'Show GBP',
            //             payload: 'DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED',
            //         }
            //     ]
            // }
            //---------------------------------------------------
            //  Виводить валюти через  post back button
            //===================================================
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
            //====================================================
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
controller.hears('(.*)', 'message_received', function (bot, message) {

    log.info(message.text);
    MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        log.info("Connected successfully to server");

        const db = client.db(dbName);
        let isUser = false;
        findUser(message.text, message.user, db, function (isUser) {

           log.debug("==1========" + isUser + "==========" + message.user);
            let ID = message.user;

            let messageData;
            if (!isUser)
                quickReplyPhonNumber(message);
            else
                currencyButtons(message);
            client.close();

        });
    });
});
