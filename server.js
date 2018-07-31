
require('./config.js');

const SlackBot = require('slackbots');

const CryptoMessageHandler = require(__base +'models/MessageHandlers/CryptoMessageHandler.js');

const bot = new SlackBot({
	token: process.env.SLACK_TOKEN,
	name: 'Btc Price',
});

// Start handler
bot.on('start', () => {
});

bot.on('message', function(messageData) {
	//console.log("bot.on('message'", messageData);

	if (messageData.type == 'message') {
		if (!messageData.subtype) {
			var cryptoMessageHandler = new CryptoMessageHandler({
				text: messageData.text
			});
			cryptoMessageHandler.determineResponse().then(function (responseText) {
				respond(messageData, responseText);
			});
			//handleMessage(messageData);
		}
		// else if (messageData.subtype == 'message_changed') {
		// 	handleMessage(messageData.message);
		// }
	}
	else if (messageData.type == 'desktop_notification') {
		handleDirectMessage(messageData);
	}

});


respond = function(messageData, responseText) {
	if (!responseText) {
		return;
	}

	//console.log('respond', responseText);

	var channel = messageData.channel;
	
    bot.postMessage(
		channel,
		responseText,
		{
			'slackbot': true,
			icon_emoji: ':chart:'
		}
	);
};


handleMessage = function(messageData) {

	var subtype = messageData.subtype;
	if (subtype == 'bot_message') {
		return;
	}

	var text = messageData.text;
	if (!text.startsWith("peter ")) {
		return;
	}
	text = text.substring(6);

	var channel = messageData.channel;
	var user = messageData.user;

    bot.postMessage(
		channel,
		text,
		{
			'slackbot': true,
			icon_emoji: ':cat:'
		}
	).then(function(data) {
		//console.log('postMessage.then', data);
		setTimeout(() => {
			animateMessage(data);
		}, 1400);
	});

	// console.log('pmtc', channel, text);
	// console.log('pmtc', messageData);

};

animateMessage = async function(postedData) {

	if (!postedData.i) {
		postedData.i = 0;
	}
	
	var text = postedData.message.text;

	if (postedData.i >= text.length) {
		return;
	}

	var num = 1;
	text = text.substr(num) + text.substr(0, num);

	postedData.message.text = text;

	bot.updateMessage(
		postedData.channel,
		postedData.ts,
		text
	);

	postedData.i++;

	setTimeout(() => {
		animateMessage(postedData);
	}, 400);

};


bot.on('error', (error) => {
	console.log(error);
});