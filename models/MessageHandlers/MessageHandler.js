
const extend = require('extend');


class MessageHandler {

	constructor(_opt) {
		var opt = {
			text: null,
		};
		opt = extend({}, opt, _opt);

		this.text = opt.text;
	}

	async determineResponse() {
		return this.text;
	}

}

module.exports = MessageHandler;
