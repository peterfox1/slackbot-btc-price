
require('../config.js');
const CryptoMessageHandler = require(__base +'models/MessageHandlers/CryptoMessageHandler.js');


testBtcMessage = async function(messageText) {
	var cryptoMessageHandler = new CryptoMessageHandler({
		text: messageText
	});
	var responseText = await cryptoMessageHandler.determineResponse();
	console.log(messageText, "->\r\n", responseText);
};

// testBtcMessage('btc to usd');
// testBtcMessage('btc to gbp');
testBtcMessage('chart btc to usd');