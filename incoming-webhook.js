// incoming_webhook.js

module.exports = function(webserver, controller) {
    // Receive post data from fb, this will be the messages you receive 
    webserver.post('/webhook', function(req, res) {
        // respond to FB that the webhook has been received.
        res.status(200);
        res.send('ok');

        var bot = controller.spawn({});

        // Now, pass the webhook into be processed
        controller.handleWebhookPayload(req, res, bot);
    });
    // Perform the FB webhook verification handshake with your verify token 
    webserver.get('/webhook', function(req, res) {
        if (req.query['hub.mode'] === 'subscribe' &&
            req.query['hub.verify_token'] === '11') {
                res.send(req.query['hub.challenge']);
            } else {
                res.send('token'+process.env.verify_token);
            }
    });
/* webserver.get('/webhook', function(req, res) {
     if (req.query['hub.mode'] == 'subscribe') {
         if (req.query['hub.verify_token'] == controller.config.verify_token) {
             res.send(req.query['hub.challenge']);
         } else {
             res.send('token'+process.env.verify_token);
         }
     }
 });*/
};