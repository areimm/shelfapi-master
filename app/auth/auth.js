const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db/db').pool;
const loginSecretKey = '!Golge[0]';
const moment = require('moment');
const crypto = require('crypto');

const { body, validationResult } = require('express-validator');
const { sql } = require('../db/db');
const auth = async (req, res, next) => {
    if (req.body?.senderType == "reset-user" || req.body.values?.senderType == "reset-user") {
        next();
        return;
    }
    const token = req.headers.authorization;

    if (!token) {
        return res.status(400).json({ error: 'Token not found!' });
    }

    try {
        const decoded = jwt.verify(token, loginSecretKey);
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM users WHERE remember = ?', [decoded.id]);
        conn.release();
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid token!' });
        }

        const user = rows[0];
        req.user = user;
        next();
    } catch (err) {
        if (err.code == "ECONNREFUSED")
            return res.status(500).json(err);

        return res.status(401).json({ error: err });
    }
};

const tokenAuth = async (req, res, next) => {
    try {
        const token = req.headers.tokenauth;
        if (!token) {
            return res.status(400).json({ error: 'Token not found!' });
        }

        const { error, result } = await sql().select(['*']).from('tokens').where('token', '=', token).execute();
        if (error) {
            return res.status(500).json(error);
        }
        if (!result[0].userid) {
            return res.status(400).json({ error: 'Invalid token!' });
        }
        else {
            req.token = result[0];
            const { error: userErr, result: userRes } = await sql().select(['*']).from('users').where('id', '=', result[0].userid).execute();
            if (userErr) {
                return res.status(500).json(error);
            }
            if (!result[0].id) {
                return res.status(401).json({ error: 'Invalid token!' });
            }
            req.user = userRes[0];

            next();
        }
    } catch (error) {
        return res.status(501).json({ error: error });
    }

};

const setToken = async (id) => {
    const rnd = crypto.randomBytes(64).toString('hex');
    const token = jwt.sign({ id: rnd }, loginSecretKey, { expiresIn: '4h' });
    const conn = await pool.getConnection();
    await conn.query('update users set remember = ? WHERE id = ?', [rnd, id]);
    conn.release();
    return token;
}

const compare = async (str, hash) => {
    try {
        const match = await bcrypt.compare(str, hash);
        return match;
    } catch (err) {
        return false;
    }
}

const decodeToken = async (token) => {
    const decoded = jwt.verify(token, loginSecretKey);
    return decoded;
}

const hash = async (str) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(str, salt);
    return hash;
}


/**
 * Bu method ile isteklerinizi kontrol edebilirsiniz.
 * @param {Array} fields - Kontrol edilecek alanların isimlerini içeren dizi.
 * @param {Array} checks - Kontrol edilecek alanların kontrol türlerini içeren dizi.
 * @param {Array} checks - Kontrol türü. empty, email, numeric, min, max, length, equal, date , length,
 * @example
 * check(['name', 'email','password'], [['empty', 'min-6', 'max-20'], ['empty', 'email'], ['equal-repass']])
 */
const check = (fields = [], checks = []) => {
    if (!Array.isArray(checks)) {
        throw new Error('Checks parameter must be an array');
    }
    return [
        ...checks.map((check, index) => {
            if (!Array.isArray(check)) {
                throw new Error(`Check at index ${index} must be an array`);
            }

            const validations = check.map(validation => {
                const [type, param] = validation.split('-');
                switch (type) {
                    case 'empty':
                        return body(fields[index]).notEmpty().withMessage(`${fields[index]} is required`);
                    case 'email':
                        return body(fields[index]).isEmail().withMessage(`${fields[index]} is not valid`);
                    case 'numeric':
                        return body(fields[index]).isNumeric().withMessage(`${fields[index]} is not valid`);
                    case 'min':
                        return body(fields[index]).isLength({ min: param }).withMessage(`${fields[index]} must be at least ${param} characters`);
                    case 'max':
                        return body(fields[index]).isLength({ max: param }).withMessage(`${fields[index]} must be at most ${param} characters`);
                    case 'length':
                        return body(fields[index]).isLength({ min: param, max: param }).withMessage(`${fields[index]} must be ${param} characters`);
                    case 'equal':
                        return body(fields[index]).custom((value, { req }) => {
                            if (value !== req.body[param]) {
                                throw new Error(`${fields[index]} must be equal to ${param}`);
                            }
                            return true;
                        });
                    case 'date':
                        const isdate = body(fields[index]).custom((value, { req }) => {
                            const userDate = moment(value, 'DD-MM-YYYY HH:mm:ss', true);
                            if (!userDate.isValid()) {
                                throw new Error(`${fields[index]} is not valid`);
                            }

                            return true;
                        });
                        return isdate;
                    default:
                        throw new Error(`Invalid validation "${type}"`);
                }
            });

            return validations;
        }),
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const errorMessages = errors.array().map((error) => {
                    return {
                        field: error.param,
                        message: error.msg
                    };
                })
                return res.status(400).json(errorMessages);
            }
            return next();
        }
    ];
};

module.exports = { auth, tokenAuth, setToken, decodeToken, compare, hash, check };