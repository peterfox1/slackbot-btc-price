
const extend = require('extend');

const MessageHandler = require(__base +'models/MessageHandlers/MessageHandler.js');
const BtcPrice = require(__base +'models/BtcPrice.js');


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
		if (getAt(words, 0) !== null && !isNaN(getAt(words, 0))) {
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

module.exports = CryptoMessageHandler;
