
const extend = require('extend');
const axios = require('axios');


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
		if (num < 9) { num = "0"+ num; }
		return num;
	}
	dateToDateString(m) {
		return m.getUTCFullYear() +"-"+ this.dateZeroPad(m.getUTCMonth()+1) +"-"+ this.dateZeroPad(m.getUTCDate());
	}
	dateToDateTimeString(m) {
		return dateToDateString(m) + " " + m.getUTCHours() + ":" + m.getUTCMinutes() + ":" + m.getUTCSeconds();
	}

}

module.exports = BtcPrice;
