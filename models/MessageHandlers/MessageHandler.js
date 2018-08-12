
const extend = require('extend');


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

module.exports = MessageHandler;
