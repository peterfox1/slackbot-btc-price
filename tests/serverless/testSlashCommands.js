
require('../../config.js');
const serverless = require(__base +'serverless-gcf.js');


fnMock_send = function(content) {
	console.log('res_send', content);
};
getMock_res = function() {
	return {
		send: fnMock_send,
		json: fnMock_send,
	};
};

testMessage = async function(messageText) {
	var req = {
		body: {
			text: messageText
		},
		method: 'POST'
	};
	var res = getMock_res();
	await serverless.btcPrice(req, res);
};

testMessage('btc to usd');
// testMessage('btc to gbp');
// testMessage('chart btc to usd');