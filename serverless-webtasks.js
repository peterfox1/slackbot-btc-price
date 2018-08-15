
// Deploy:
// serverless deploy

const JSONc = require('circular-json');

const axios = require('axios');
const extend = require('extend');

process.env.SLACK_TOKEN = '';
process.env.SLACK_VERIFICATION_TOKEN = '';





















// -- BtcPrice -- //


class BtcPrice {
	
	constructor() {
		this.URL = 'https://api.coindesk.com/v1/bpi/';
		
		this.EP_HISTORICAL = 'historical';
		this.EP_CURRENT = 'current';
		
		var paths = {};
		paths[this.EP_HISTORICAL] = 'historical/close.json';
		paths[this.EP_CURRENT] = 'currentprice/<CURRENCY>.json';
		this.URL_EP_PATHS = paths;
	}
	
	async request(_opt) {
		
		var opt = {
			endpoint: null,
			params: null,
			urlReplace: null,
		};
		opt = extend({}, opt, _opt);
		
		var url = this.URL + this.URL_EP_PATHS[opt.endpoint];
		
		if (opt.urlReplace) {
			// Loop through and apply string replacements
			for (let i = 0; i < opt.urlReplace.length; i++) {
				const replace = opt.urlReplace[i];
				url = url.replace(replace[0], replace[1]);
			}
		}
		
		//console.log(url, opt.params); return;
		
		try {
			const response = await axios.get(
				url,
				{
					params: opt.params
				}
			)
			if (response.data.bpi) {
				return response.data.bpi;
			}
		} catch (error) {
			console.error(error);
		}
		
		return null;
		
	}
	
	async getCurrent(_opt) {
		
		var opt = {
			crypto: 'btc',	// Currently only supports btc
			fiat: 'usd',
		};
		opt = extend({}, opt, _opt);
		
		var fiat = opt.fiat.toUpperCase();
		
		var urlReplace = [
			[ '<CURRENCY>', fiat ]
		];
		
		var response = await this.request({
			endpoint: this.EP_CURRENT,
			urlReplace: urlReplace,
		});
		
		return response[fiat].rate_float;
		
	}
	
	async getHistorical(_opt) {
		
		var opt = {
			index: null,
			startDate: null,
			endDate: null,
			crypto: 'btc',	// Currently only supports btc
			fiat: 'usd',
		};
		opt = extend({}, opt, _opt);
		
		var params = {};
		if (opt.index) { params.index = opt.index; }
		if (opt.startDate) { params.start = this.dateToDateString(opt.startDate); }
		if (opt.endDate) { params.end = this.dateToDateString(opt.endDate); }
		if (opt.fiat) { params.currency = opt.fiat.toUpperCase(); }
		
		return await this.request({
			endpoint: this.EP_HISTORICAL,
			params: params,
		});
		
	}
	
	dateZeroPad(num) {
		if (num < 10) { num = "0"+ num; }
		return num;
	}
	dateToDateString(m) {
		return m.getUTCFullYear() +"-"+ this.dateZeroPad(m.getUTCMonth()+1) +"-"+ this.dateZeroPad(m.getUTCDate());
	}
	dateToDateTimeString(m) {
		return dateToDateString(m) + " " + m.getUTCHours() + ":" + m.getUTCMinutes() + ":" + m.getUTCSeconds();
	}
	
}



// -- MessageHandler -- //

class MessageHandler {
	
	constructor(_opt) {
		var opt = {
			text: null,
			isDirect: false,
		};
		opt = extend({}, opt, _opt);
		
		/**
		 * @type {string}
		 */
		this.text = opt.text;
		this.isDirect = opt.isDirect;
	}
	
	async determineResponse() {
		return this.text;
	}
	
}


//-- cryptoMessageHandler --//


class CryptoMessageHandler extends MessageHandler {
	
	constructor(_opt) {
		super(_opt);
		this.CURRENCY_FIAT = 1;
		this.CURRENCY_CRYPTO = 2;
	}
	
	async determineResponse() {
		
		// Pre process text
		var text = this.text.toLowerCase();
		var words = text.split(" ");
		// var words = text.split(" ");
		
		// Options to determine:
		var parsedInput = {
			fromAmount	: 1,
			from		: 'btc',
			to			: 'usd',
		};
		var isChart	= false;
		
		// Phrases: (requires from & to)
		// "[qty] from ['to'] to ['chart']"
		// "2 btc to usd"
		// "btc to usd"
		// "btc to usd chart"
		// "btc usd"
		// "btc usd chart"
		
		// Direct-only Phrases: (all paramters are optional, from and to must be in order)
		// "[qty] [from] ['to'] [to] ['chart']"
		// "2 btc"
		// "btc usd chart"
		// ""
		// "chart"
		
		
		// Helper function to safely get values from the words array
		var getAt = function (array, index) {
			if (index < 0) { index += array.length };	// negative index, loop round to the end of the array.
			if (array.length == 0 || index >= array.length || index < 0) { return null; }	// safely return null if the index is out of bounds.
			return array[index];
		}
		
		
		// Quicky filter out invalid messages (possibly not necessary)
		if (
			words.length > 4	// Too many words
		) {
			return false;
		}
		
		
		// Determine if it's a chart (default: false)
		if (getAt(words, -1) == 'chart') {
			// Last word is 'chart'!
			isChart = true;
			words.pop();
		}
		
		
		// Determine amount to convert (default: 1)
		var amount = getAt(words, 0);
		if (amount !== '' && amount !== null && !isNaN(amount)) {
			// First 'word' is a number
			parsedInput.fromAmount = words[0] - 0;
			words.splice(0, 1);
		}
		
		
		// Determine conversion info
		
		// ..Strip 'to'
		if (getAt(words, 1) == 'to') {
			words.splice(1, 1);
		}
		
		// ..Validate non-direct messgaes
		if (
			!this.isDirect
			&&
			!(
				this.isValidCurrencyIso(getAt(words, 0))
				&&
				this.isValidCurrencyIso(getAt(words, 1))
			)
		) {
			// Missing the required from & to currencies
			return false;
		}
		
		
		// Determine from & to currencies
		if (this.isValidCurrencyIso(getAt(words, 0))) {
			parsedInput.from = getAt(words, 0);
		}
		if (this.isValidCurrencyIso(getAt(words, 1))) {
			parsedInput.to = getAt(words, 1);
		}
		
		
		// Action the parsed input
		
		if (isChart) {
			return this.response_btcChart(parsedInput);
		}
		
		return this.response_btcConversion(parsedInput);
		
	}
	
	async response_btcConversion(_opt) {
		var opt = {
			fromAmount: 1,
			from: 'btc',
			to: 'usd',
		};
		opt = extend({}, opt, _opt);
		
		var btcPrice = new BtcPrice();
		
		try {
			var currentPrice = await btcPrice.getCurrent({
				crypto	: opt.from,
				fiat	: opt.to,
			});
		} catch (error) {
			return error;
		}
		
		currentPrice *= opt.fromAmount;
		
		//currentPrice = (currentPrice.replace(',','')-0).toFixed(2);
		currentPrice = this.numberWithCommas(currentPrice.toFixed(2));
		
		var fromAmount_str = opt.fromAmount;
		var from_str = opt.from.toUpperCase();
		var to_str = opt.to.toUpperCase();
		var to_symbol = this.symbolForCurrency(opt.to);
		
		return `*${fromAmount_str}* (${from_str}) is *${to_symbol}${currentPrice}* (${to_str})`;
	}
	
	async response_btcChart(_opt) {
		var opt = {
			fromAmount	: 1,
			from		: 'btc',
			to			: 'usd',
			days		: 7,	// how many days to fetch
			offset		: 0,	// how many days ago
		};
		opt = extend({}, opt, _opt);
		
		var btcPrice = new BtcPrice();
		
		var endDate = new Date();
		endDate.setDate(endDate.getDate() - opt.offset - 1);	// 1 extra day for difference comparision
		
		var startDate = new Date(endDate.getTime());
		startDate.setDate(startDate.getDate() - opt.days);
		
		try {
			var historicalPrices = await btcPrice.getHistorical({
				startDate	: startDate,
				endDate		: endDate,
				crypto		: opt.from,
				fiat		: opt.to,
			});
			var currentPricePromise = btcPrice.getCurrent({
				crypto		: opt.from,
				fiat		: opt.to,
			});
		} catch (error) {
			return error;
		}
		
		// Ensure order is correct by converting to an array and sorting.
		// Collect min/max at the same time.
		var price_min = 0;
		var price_max = 0;
		
		var historicalPrices_array = [];
		for (const date in historicalPrices) {
			var price = historicalPrices[date];
			price *= opt.fromAmount;	// Apply the specified amount
			
			historicalPrices_array.push({
				type: 'normal',
				date: date,
				price: price,
			});
			
			// Set min/max
			if (!price_min) {
				price_min = price;
				price_max = price;
			}
			else if (price < price_min) {
				price_min = price;
			}
			else if (price > price_max) {
				price_max = price;
			}
		}
		
		historicalPrices_array.sort(function(a, b) {
			if (a.date < b.date) { return -1; }
			if (a.date > b.date) { return 1; }
			return 0;
		});
		
		var currentPrice = await currentPricePromise;
		currentPrice *= opt.fromAmount;	// Apply the specified amount
		
		var date = btcPrice.dateToDateString(new Date());
		//console.log('currentPrice', currentPrice);
		historicalPrices_array.push({
			type: 'today',
			date: date,
			price: currentPrice,
		});
		
		// Produce response
		
		/*
		min: 100
		max: 124

		delta: 24
		steps: 12

		112 = 6

		112 - 100 = 12
		12 / 24 = 0.5
		0.5 * 12 = 6

		max - val = x
		x / delta = y
		y * steps = z
		*/
		
		var price_delta = price_max - price_min;
		var acsii_chart_steps = 30;
		
		var response = '';
		
		for (let i = 1; i < historicalPrices_array.length; i++) {
			const dataPoint = historicalPrices_array[i];
			const date = dataPoint.date;
			const price = dataPoint.price;
			
			var lastPrice = historicalPrices_array[i-1].price;
			var diff = dataPoint.price - lastPrice;
			
			// Determine acsii chart 'step/indent'
			var step = ((price - price_min) / price_delta) * acsii_chart_steps;
			
			historicalPrices_array[i].step = step;
			
			var price_symbol = this.symbolForCurrency(opt.to);
			var price_str = price.toFixed(2);
			
			var step_str = '';
			for (let i = 0; i < step; i++) {
				step_str += ' ';
			}
			
			var change_symbol = (diff >= 0) ? ':christmas_tree:' : ':small_red_triangle_down:';
			// var change_symbol = (diff >= 0) ? ':arrow_lower_right:' : ':arrow_lower_left:';
			// var change_symbol = (diff >= 0) ? ':christmas_tree:' : ':fire:';
			// var change_symbol = (diff >= 0) ? ':chart_with_downwards_trend:' : ':chart_with_upwards_trend:';
			if (diff == 0) { change_symbol = ':zzz:'; }
			
			if (dataPoint.type == 'today') {
				response += `_${date} : ${price_symbol}${price_str}  ${step_str}${change_symbol}_\r\n`;
				continue;
			}
			response += `${date} : *${price_symbol}${price_str}*  ${step_str}${change_symbol}\r\n`;
		}
		
		//console.log(historicalPrices_array);
		
		return response;
		
	}
	
	
	/**
	 * Validate currency ISO string
	 *
	 * @param {string} currencyIso
	 */
	isValidCurrencyIso(currencyIso) {
		if (this.isValidCurrencyIso_fiat(currencyIso)) {
			return this.CURRENCY_FIAT;
		}
		if (this.isValidCurrencyIso_crypto(currencyIso)) {
			return this.CURRENCY_CRYPTO;
		}
		return false;
	}
	isValidCurrencyIso_fiat(currencyIso) {
		var valid = {
			'usd': 1,
			'gbp': 1,
			'eur': 1,
		};
		return (typeof(valid[currencyIso]) !== 'undefined');
	}
	isValidCurrencyIso_crypto(currencyIso) {
		var valid = {
			'btc': 1,
		};
		return (typeof(valid[currencyIso]) !== 'undefined');
	}
	
	
	numberWithCommas(x) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	
	symbolForCurrency(currency) {
		
		currency = currency.toLowerCase();
		
		if (currency == 'usd') { return '$'; }
		if (currency == 'gbp') { return '£'; }
		if (currency == 'eur') { return '€'; }
		
		return '';
		
	}
	
}




















/**
 * Receive a Slash Command request from Slack.
 *
 * Trigger this function by making a POST request with a payload to:
 * https://[YOUR_REGION].[YOUR_PROJECT_ID].cloudfunctions.net/kgsearch
 *
 * @example
 * curl -X POST "https://us-central1.your-project-id.cloudfunctions.net/btcPrice" --data '{"token":"[YOUR_SLACK_TOKEN]","text":"giraffe"}'
 *
 * @param {object} req Cloud Function request object.
 * @param {object} req.body The request payload.
 * @param {string} req.body.token Slack's verification token.
 * @param {string} req.body.text The user's search query.
 * @param {object} res Cloud Function response object.
 */
var btcPrice = async function(req, res) {
	//res.json(JSONc.stringify(req));
	
	try {
		verifyWebhook(req.body);
	} catch (e) {
		//res.json({ 'error': 'Invalid credentials:' + process.env.SLACK_VERIFICATION_TOKEN });
		res.json({ 'error': 'Invalid credentials' });
		return;
	}
	
	var cryptoMessageHandler = new CryptoMessageHandler({
		text: req.body.text,
		isDirect: true,
	});
	
	cryptoMessageHandler.determineResponse().then(function (responseText) {
		respond(req, res, responseText);
	});
};


module.exports = function (context, done) {
	
	var res = {
		json: function(content) {
			done(null, content);
		}
	};
	
	// done(null, JSONc.stringify(context));
	// return;
	
	btcPrice(context, res);
	
};



/**
 * Respond to to the request.
 *
 * @param {object} req Cloud Function request object.
 * @param {object} res Cloud Function response object.
 * @param {string} responseText
 */
var respond = function(req, res, responseText) {
	if (!responseText) {
		return;	// respond with empty/null response?
	}
	
	res.json(formatSlackMessage(responseText));
};







/**
 * Verify that the webhook request came from Slack.
 *
 * @param {object} body The body of the request.
 * @param {string} body.token The Slack token to be verified.
 */
function verifyWebhook(body) {
	if (!body || body.token !== process.env.SLACK_VERIFICATION_TOKEN) {
		const error = new Error('Invalid credentials');
		//const error = new Error('Invalid credentials:' + body.token);
		error.code = 401;
		throw error;
	}
}





/**
 * Format the Knowledge Graph API response into a richly formatted Slack message.
 *
 * @param {string} query The user's search query.
 * @param {object} response The response from the Knowledge Graph API.
 * @returns {object} The formatted message.
 */
function formatSlackMessage(responseText) {
	
	// Prepare a rich Slack message
	// See https://api.slack.com/docs/message-formatting
	const slackMessage = {
		response_type: 'in_channel',
		text: responseText
	};
	
	return slackMessage;
}

