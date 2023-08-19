const express = require('express');
const router = express.Router();
const { auth } = require('../auth/auth.js');
const { sql } = require('../db/db.js');
const { check } = require('../auth/auth.js');

router.post('/getroom', auth, async (req, res) => {
    try {
        const { result, error } = await sql().select(['*']).from('chat').where('users', 'like', '%' + req.user.id + '%').execute();
        if (error) throw error;
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.post('/delete/message', auth, async (req, res) => {
    try {
        const { result, query, error } = await chatmodule().deleteJson(req.body);
        if (error) throw error;
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.post('/newroom', auth, async (req, res) => {
    try {
        const { result, query, error } = await sql().insert('chat').set(['userid', 'token', 'data'], [req.body.userid, req.body.token, '{"message":[]}']).execute();
        if (error) throw error;
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

function chatmodule() {
    return {
        insertJson: async (data) => {
            const { result, query, error } = await sql().update('chat').set(['data'], ['JSON_ARRAY_APPEND(data, "$.message", "{}")'], [
                `JSON_OBJECT("id",CASE WHEN JSON_LENGTH(JSON_EXTRACT(data, '$.message')) <= 0 THEN 0 ELSE JSON_LENGTH(JSON_EXTRACT(data, '$.message')) - 1 END
                ,"text", '${data.message.text}',"senderId", ${data.message.senderId},"time", '${data.message.time}',"read", false,"type", '${data.message.type}')`
            ]).where('token', '=', data.room).execute();
            if (error) throw error;
            return await { result, query, error };
        },
        updateJson: {
            read: async (data) => {
                const { result, query, error } = await sql().update('chat').set(['data'], ['JSON_SET(data,{},TRUE)'], [
                    `REPLACE(REPLACE(JSON_SEARCH(data, 'one', ${data.id}, NULL, '$.message[*].id'), '"',''),'.id','.read')`
                ]).where('token', '=', data.room).execute();
                return await { result, query, error };
            },
            message: async (data) => {
                const { result, query, error } = await sql().update('chat').set(['data'], [`JSON_SET(data,{},'${data.text}')`], [`REPLACE(REPLACE(JSON_SEARCH(data, 'one', ${data.id}, NULL, '$.message[*].id'), '"',''),'.id','.text')`]).where('token', '=', data.token).execute();
                return await { result, query, error };
            }
        },
        deleteJson: async (data) => {
            const { result, query, error } = await sql().update('chat').set(['data'], [`JSON_REMOVE(data,REPLACE(REPLACE(JSON_SEARCH(data, "one",${data.id}, NULL, "$.message[*].id"),".id",""),'"',""))`]).where('token', '=', data.token).execute();
            return await { result, query, error };
        }
    }
}

module.exports = { router, chatmodule };