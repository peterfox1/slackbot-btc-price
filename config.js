
global.__base = __dirname + '/';

// process.env.SLACK_TOKEN = '';
// process.env.SLACK_VERIFICATION_TOKEN = '';

process.on('unhandledRejection', r => console.log(r));