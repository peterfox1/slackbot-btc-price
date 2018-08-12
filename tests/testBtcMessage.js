
require('../config.js');
const CryptoMessageHandler = require(__base +'models/MessageHandlers/CryptoMessageHandler.js');


testBtcMessage = async function(messageText, isDirect) {
	var cryptoMessageHandler = new CryptoMessageHandler({
		text: messageText,
		isDirect: !!isDirect,
	});
	var responseText = await cryptoMessageHandler.determineResponse();
	
	// Print input & output for manual testing
	if (isDirect) {
		messageText += ' (direct)';
	} 
	console.log(messageText, "->\r\n", responseText);
};

// testBtcMessage('btc to usd');
// testBtcMessage('btc to gbp');
// testBtcMessage('btc to usd chart');

// testBtcMessage('btc usd');
// testBtcMessage('btc gbp');
// testBtcMessage('btc usd chart');

// testBtcMessage('3 btc usd');
// testBtcMessage('3 btc gbp');
// testBtcMessage('3 btc usd chart');

/* Invalid messages */
// testBtcMessage('btc usd blah blah blah');
// testBtcMessage('btc');


/* Direct messages */

// testBtcMessage('btc to gbp', true);
// testBtcMessage('btc gbp', true);
//
// testBtcMessage('btc', true);
// testBtcMessage('3', true);
// testBtcMessage('3 btc', true);

// testBtcMessage('', true);
testBtcMessage('chart', true);
testBtcMessage('0.1 chart', true);