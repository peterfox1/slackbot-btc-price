
// Deploy:
// gcloud beta functions deploy btcPrice --runtime nodejs8 --trigger-http
// gcloud beta functions deploy btcPrice --runtime nodejs8 --trigger-http --env-vars-file .env.yaml

require('./config.js');

//const JSONc = require('circular-json');
const CryptoMessageHandler = require(__base +'models/MessageHandlers/CryptoMessageHandler.js');


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
exports.btcPrice = async function(req, res) {
	
	if (req.method !== 'POST') {
		const error = new Error('Only POST requests are accepted');
		error.code = 405;
		throw error;
	}
	
	verifyWebhook(req.body);
	
	var cryptoMessageHandler = new CryptoMessageHandler({
		text: req.body.text
	});
	cryptoMessageHandler.determineResponse().then(function (responseText) {
		respond(req, res, responseText);
	});
	
	// res.type('json');
	// res.send(JSONc.stringify(req));
	// res.json(req.body);
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
		text: responseText + 'x'
	};
	
	return slackMessage;
}


