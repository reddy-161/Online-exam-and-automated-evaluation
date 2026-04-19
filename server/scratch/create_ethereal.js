const nodemailer = require('nodemailer');

nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }
    console.log('CREDENTIALS_START');
    console.log(`EMAIL_USER=${account.user}`);
    console.log(`EMAIL_PASS=${account.pass}`);
    console.log('CREDENTIALS_END');
});
