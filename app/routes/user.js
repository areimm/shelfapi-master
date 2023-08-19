const express = require('express');
const router = express.Router();
const { sql } = require('../db/db');
const { mail } = require('../modules/mail.module');
const { auth, hash, check, compare, setToken, tokenAuth } = require('../auth/auth');
const crypto = require('crypto');
frontend = 'http://localhost:8100/token'

router.post('/', (req, res) => {
    res.json('User route');
});

router.post('/login', check(['email', 'password'], [['empty', 'email'], ['empty']]), async (req, res) => {
    try {
        const { result, error } = await sql().select(['*']).from('users').where('email', '=', req.body.email).execute();
        if (error) {
            return res.status(502).json(error);
        }
        if (result.length === 0) {
            return res.status(400).json('Email or password is wrong!');
        }
        const isMatch = await compare(req.body.password, result[0].password);
        if (!isMatch) {
            return res.status(400).json([{ message: 'Email or password is wrong!' }]);
        }
        const token = await setToken(result[0].id);
        res.json({ token });
    } catch (error) {
        res.json(error);
    }
});
router.post('/register', check(['name', 'email', 'password', 'created_at'], [['empty', 'max-20'], ['empty', 'email'], ['empty', 'min-6', 'max-20', 'equal-confirmPassword'], ['empty', 'date']]), async (req, res) => {
    try {
        const { result, error } = await sql().select(['*']).from('users').where('email', '=', req.body.email).execute();
        if (error) {
            return res.status(500).json(error);
        }
        if (result.length > 0) {
            return res.status(500).json('Email already exists!');
        }
        const hashedPassword = await hash(req.body.password);
        const html = require('path').join(__dirname, '../mail/welcome/welcome.html')
        const css = require('path').join(__dirname, '../mail/index.css')
        const link = `https://localhost:8100/verify/${crypto.randomBytes(64).toString('hex')}`;
        let asd, iner;
        req.body.permission ? { result: asd, error: iner } = await sql().insert(['name', 'email', 'password', 'created_at', 'authority']).into('users').values([req.body.name, req.body.email, hashedPassword, req.body.created_at, req.body.permission]).execute() : { result: asd, error: iner } = await sql().insert(['name', 'email', 'password', 'created_at']).into('users').values([req.body.name, req.body.email, hashedPassword, req.body.created_at]).execute()
        if (iner) {
            res.status(500).json(iner);
        }
        await mail().from('Eren Bulut').to(req.body.email).title('Welcome').html(html, { name: req.body.name, email: req.body.email, link: link }).css(css).send();
        res.json(asd);

    } catch (err) {
        res.json(err.message);
    }
});
router.post('/get/self', auth, async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        res.json(err);
    }
});
router.post('/get/all', auth, async (req, res) => {
    try {
        const { error, query, result } = await sql().select(['*']).from('users').execute();
        if (error) {
            return res.json({ error });
        }
        res.json(result);
    } catch (err) {
        res.json(err);
    }
});
router.post('/get/id', auth, async (req, res) => {
    try {
        const { error, query, result } = await sql().select(['*']).from('users').orWhere('id', '=', req.body.id).execute();

        if (error) {
            return res.json({ error });
        }
        res.json(result);
    } catch (err) {
        res.json(err.message);
    }
});
router.post('/get/token', check(['token'], [['empty']]), async (req, res) => {
    try {
        const { error, result } = await sql().select(['*']).from('tokens').where('token', '=', req.body.token).execute();
        if (error) {
            return res.status(500).json(error);
        }
        if (result.length === 0) {
            return res.status(500).json('Token not found!');
        }
        if (!result[0].userid) {
            return res.json('Token dosent match with user!');
        }
        res.status(200).json(result);
    } catch (err) {
        res.json(err)
    }
});
router.post('/update', check(['values.email'], [['empty']]), auth, async (req, res) => {
    try {
        const values = await [
            req.body.values?.name || null,
            req.body.values?.email || null,
            req.body.values?.password ? await hash(req.body.values.password) : null,
            req.body.values?.permission || null,
            req.body.values?.email_verified || null,
            req.body.values?.picture || null
        ];
        const { error, query, result } = await sql().update('users').set(['name', 'email', 'password', 'authority', 'email_verified', 'picture'], values).where('email', '=', req.body.values.email).execute();
        if (error) {
            return res.status(500).json(error);
        }
        res.status(200).json(result);
    } catch (err) {
        res.json(err);
    }
});
router.post('/delete', check(['email'], [['empty']]), auth, async (req, res) => {
    try {
        const { error, result } = await sql().delete('users').where('email', '=', req.body.email).execute();
        if (error) {
            return res.json(error);
        }
        res.json(result);
    } catch (err) {
        res.json(err);
    }
});
router.post('/deletetoken', check(['token'], [['empty']]), async (req, res) => {
    try {
        const { error, result } = await sql().delete('tokens').where('token', '=', req.body.token).execute();
        if (error) throw error;
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/check-token', tokenAuth, async (req, res) => {
    try {
        const type = req.token.type.split('-');
        if (type[0] == 'reset') {
            if (type[1] == 'password') {
                const { error, result } = await sql().update('users').set(['password'], [await hash(req.body.value)]).where('id', '=', req.token.userid).execute();
                if (error) {
                    return res.status(500).json(error);
                }
                else {
                    if (result == "success") {
                        const { error, result } = await sql().delete('tokens').where('token', '=', req.token.token).execute();
                        if (error) {
                            return res.status(500).json(error);
                        }
                        else {
                            return res.status(200).json(result);
                        }
                    }
                    else {
                        return res.status(500).json(result);
                    }
                }
            }
        }
    } catch (err) {
        res.json({ error: err.message });
    }
});
router.post('/send/reset/email', async (req, res) => {
    try {
        const { result: user, error: userErr } = await sql().select(['*']).from('users').where('email', '=', req.body.email).execute();
        if (userErr) {
            return res.status(500).json(userErr);
        }
        if (user.length === 0) {
            return res.status(400).json('User not found!');
        } else {
            const html = require('path').join(__dirname, '../mail/reset/email.html')
            const css = require('path').join(__dirname, '../mail/index.css')
            const token = await crypto.randomBytes(64).toString('hex');
            const link = `${frontend}/${token}`;
            const { result, error } = await sql().insert(['userid', 'type', 'token']).into('tokens').values([user[0].id, 'reset-email', token]).execute();
            if (error) {
                return res.status(500).json(error);
            }
            const { info } = await mail().from('Eren Bulut').to(user[0].email).title('Reset').html(html, { name: user[0].name, email: user[0].email, link: link }).css(css).send();
            info.accepted.length > 0 ? res.status(200).json(result) : res.status(500).json(info);
        }
    } catch (error) {
        res.status(500).json(error);
    }
})
router.post('/send/reset/password', async (req, res) => {
    try {
        const { result: user, error: userErr } = await sql().select(['*']).from('users').where('email', '=', req.body.email).execute();
        if (userErr) {
            return res.status(500).json(userErr);
        }
        if (user.length === 0) {
            return res.status(400).json('User not found!');
        } else {
            const html = require('path').join(__dirname, '../mail/reset/password.html')
            const css = require('path').join(__dirname, '../mail/index.css')
            const token = await crypto.randomBytes(64).toString('hex');
            const link = `${frontend}/${token}`;
            const { result, error } = await sql().insert(['userid', 'type', 'token']).into('tokens').values([user[0].id, 'reset-password', token]).execute();
            if (error) {
                return res.status(500).json(error);
            }
            const { info } = await mail().from('Eren Bulut').to(user[0].email).title('Reset').html(html, { name: user[0].name, email: user[0].email, link: link }).css(css).send();
            info.accepted.length > 0 ? res.status(200).json(result) : res.status(500).json(info);
        }
    } catch (error) {
        res.status(500).json(error);
    }
})
router.post('/send/verify/email', check(['email'], [['empty']]), async (req, res) => {
    try {
        const { result: user, error: userErr } = await sql().select(['*']).from('users').where('email', '=', req.body?.email).execute();
        if (userErr) {
            return res.status(500).json(userErr);
        }
        if (user.length === 0) {
            return res.status(400).json('User not found!');
        } else {
            const html = require('path').join(__dirname, '../mail/verify/email.html')
            const css = require('path').join(__dirname, '../mail/index.css')
            const token = await crypto.randomBytes(64).toString('hex');
            const link = `${frontend}/${token}`;
            const { result, error } = await sql().insert(['userid', 'type', 'token']).into('tokens').values([user[0].id, 'verify-email', token]).execute();
            if (error) {
                return res.status(500).json(error);
            }
            const { info } = await mail().from('Eren Bulut').to(user[0].email).title('Reset').html(html, { name: user[0].name, email: user[0].email, link: link }).css(css).send();

            info.accepted.length > 0 ? res.status(200).json(result) : res.status(500).json(info);
        }
    } catch (error) {
        res.status(500).json(error);
    }
})
router.post('/newroom', auth, check(['id'], [["empty"]]), async (req, res) => {
    try {
        const user_chat_data_json = JSON.parse(req.user.chat_data);
        if (user_chat_data_json.rooms.length <= 0) {
            const room_id = crypto.randomBytes(30).toString('hex');
            const { error, result } = await sql().update('users').set(['chat_data'], [JSON.stringify({ rooms: [{ token: room_id, userId: req.body.id }] })]).where('id', '=', req.user.id).execute();
            if (error) throw error;
            const { error: err, result: result2 } = await sql().insert(['token', 'users']).into('chat').values([room_id, `${req.user.id}-${req.body.id}`]).execute();
            if (err) throw err;
            res.status(200).json(result === result2 ? result : "Error!");
        } else {
            const isThere = user_chat_data_json.rooms.find(item => item.userId === req.body.id);
            if (isThere != undefined) {
                res.status(200).json("Already have room!")
            } else {
                const room_id = crypto.randomBytes(30).toString('hex');
                const { result, error } = await sql().update('users').set(['chat_data'], ['JSON_ARRAY_APPEND(chat_data, "$.rooms", "{}")'], [`JSON_OBJECT("token", '${room_id}',"userId", ${req.body.id})`]).where('id', '=', req.user.id).execute();
                if (error) throw error;
                const { error: err, result: result2 } = await sql().insert(['token', 'users']).into('chat').values([room_id, `${req.user.id}-${req.body.id}`]).execute();
                if (err) throw err;
                res.status(200).json(result === result2 ? result : "Error!");
            }
        }
    } catch (error) {
        res.status(500).json(error.message || error);
    }
})
module.exports = router;