const nodemailer = require('nodemailer');
const fs = require('fs');
const hanlebars = require('handlebars');

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'erenbulut0707@gmail.com',
        pass: 'lalojrxoekcbypkh'
    }
});

const mail = function () {
    let mailOptions = {
        from: '',
        to: '',
        subject: '',
        html: '',
    };
    let cssData = '';
    return {
        from: function (email) {
            mailOptions.from = email;
            return {
                to: function (email) {
                    mailOptions.to = email;
                    return {
                        title: function (title) {
                            mailOptions.subject = title;
                            return {
                                html: function (path, data) {
                                    const compiled = hanlebars.compile(fs.readFileSync(path, 'utf-8'));
                                    mailOptions.html = compiled(data);
                                    return {
                                        css: function (path) {
                                            cssData = fs.readFileSync(path, 'utf8');
                                            return {
                                                send: async function () {
                                                    if (!/<head.*>/.test(mailOptions.html)) {
                                                        mailOptions.html = mailOptions.html.replace(/(<html.*?>)/, `$1\n<head></head>`);
                                                    }
                                                    if (cssData) {
                                                        mailOptions.html = mailOptions.html.replace(/(<head.*?>)/, `$1\n<style>${cssData}</style>`);
                                                    }
                                                    try {
                                                        const info = await transporter.sendMail(mailOptions);
                                                        return await { info: info, error: null, mailOptions: mailOptions };
                                                    } catch (err) {
                                                        console.error(err);
                                                        return { error: err, info: null, mailOptions: mailOptions };
                                                    }
                                                }
                                            }
                                        },
                                        send: async function () {
                                            try {
                                                const info = await transporter.sendMail(mailOptions);
                                                return { info: info, error: null, mailOptions: mailOptions };
                                            } catch (err) {
                                                console.error(err);
                                                return { error: err, info: null, mailOptions: mailOptions };
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
module.exports = {
    transporter,
    mail
};