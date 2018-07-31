
require('../config.js');
const BtcPrice = require(__base +'models/BtcPrice.js');



var testBtcPrice_historical = async function() {

	var btcPrice = new BtcPrice();

	var historical = await btcPrice.getHistorical({
		startDate	: new Date('2018-01-01'),
		endDate		: new Date('2018-01-05'),
	});

	console.log('historical', historical);

};

var testBtcPrice_current = async function() {

	var btcPrice = new BtcPrice();

	var currentPrice = await btcPrice.getCurrent({
		fiat: 'usd',
	});

	console.log('current', currentPrice);

};





//testBtcPrice_historical();
testBtcPrice_current();