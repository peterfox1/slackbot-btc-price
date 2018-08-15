var StringReplacePlugin = require("string-replace-webpack-plugin");

module.exports = {
	target: 'node',
	entry: './serverless-gcf.js',
	output: {
		path: __dirname,
		filename: 'serverless-webtasks.js'
	},
	module: {
		rules: [
			// configure replacements for file patterns
			{
				test: /serverless-gcf.js$/,
				loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: /exports\.btcPrice = /ig,
							replacement: function (match, p1, offset, string) {
								return 'module.exports = ';
							}
						}
					]
				})
			}
		]
	},
	plugins: [
		// an instance of the plugin must be present
		new StringReplacePlugin()
	]
};
