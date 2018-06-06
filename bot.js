// bot.js
let Botkit = require('botkit');
let Request = require('request');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
let log = require('winston');
let {to} = require('await-to-js');
let MyModule = require("myModule");


require('dotenv').config();

let controller = Botkit.facebookbot({
    //
    verify_token: process.env.verify_token,
    access_token: process.env.access_token
});
let webserver = require('./server.js')(controller);


controller.hears('(.*)', 'facebook_postback', async function (bot, message) {

    let currency1 = message.text.substring(0, 3);
    let currency = message.text;//.substring(7, 10);
    let theDate = new Date(message.timestamp);
    let dataString = theDate.toGMTString();
    log.info(currency1 + "  --------------------   " + currency);
     [err,body] = await to(MyModule.getCurrency());
     if(err)log.error(err);
    let mybody = JSON.parse(body);
        switch (currency) {
            case "EUR -> USD":
                currency1 = currency1 + " = " + mybody.rates.USD.toFixed(2) + " USD";
                break;
            case "USD -> PLN":
                currency1 = currency1 + " = " + (mybody.rates.PLN/mybody.rates.USD).toFixed(2) + " PLN";
                break;
            case "PLN -> GBP":
                currency1 = currency1 + " = " + (mybody.rates.GBP/mybody.rates.PLN).toFixed(2) + " GBP";
                break;
            default:
                currency1 = currency1 + " = " + result.rates.USD + "USD";
                break;
        }
    console.log(currency1);
    await MyModule.updateHistory(currency1, dataString, message.user);

    bot.reply(message, currency1);
    currencyButtons(message);

});

controller.hears('(.*)', 'message_received', async function (bot, message) {

    console.log("ok");

    [err, isUser] = await to(MyModule.findUser(message));
    if (err) console.log(err);
    if (isUser)
        currencyButtons(message);
    else if (MyModule.isPhone(message.text)) {
        await MyModule.insertUser(message);
        currencyButtons(message);
    }
    else
        quickReplyPhonNumber(message);


});

const quickReplyPhonNumber =async function (message) {

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

    [err,resp] = await to(MyModule.buttonRequsst(messageData));
    if(err)log.error(err);
}


const currencyButtons = async function (message) {
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
    };
    [err,resp] = await to(MyModule.buttonRequsst(messageData));
    if(err)log.error(err);
}



