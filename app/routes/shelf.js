const express = require('express');
const { auth, check } = require('../auth/auth');
const { sql } = require('../db/db');
const router = express.Router();

router.post('/getall', auth, async (req, res) => {
    try {
        const { error, result } = await sql().select(['*']).from('shelves').execute();
        if (error) {
            return res.json(error);
        }
        res.json(result);
    } catch (error) {
        res.json({ error: error.message });
    }
});
router.post('/get', check(['num'], [['empty']]), auth, async (req, res) => {
    try {
        const { error, result } = await sql().select(['*']).from('shelves').where('num', '=', req.body.num).execute();
        if (error) {
            return res.json(error);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/update', check(['ing', 'qty', 'num'], [['empty'], ['empty'], ['empty']]), auth, async (req, res) => {
    try {
        const { result: getRes } = await sql().select(['*']).from('shelves').where('num', '=', req.body.num).execute();
        if (getRes[0] != undefined && (req.body.num != req.body.mainNum)) {
            return res.status(500).json("This shelf already exists!");
        }
        const { error, result } = await sql().update('shelves').set(['ing', 'qty', 'num'], [req.body.ing, req.body.qty, req.body.num]).where('num', '=', req.body.mainNum).execute();
        if (error) {
            return res.status(500).json(error);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/add', check(['ing', 'qty', 'num'], [['empty'], ['empty'], ['empty']]), auth, async (req, res) => {
    try {
        const { result: result1 } = await sql().select(['num']).from('shelves').where('num', '=', req.body.num).execute();
        if (result1.length > 0) {
            return res.status(500).json('This shelf already exists!');
        }
        const { error, query, result } = await sql().insert(['num', 'ing', 'qty']).into('shelves').values([req.body.num, req.body.ing, req.body.qty]).execute();
        if (error) {
            return res.json(error);
        }
        res.json(result);
    } catch (error) {
        res.json({ error: error.message });
    }
});
router.post('/delete', check(['num'], [['empty']]), auth, async (req, res) => {
    try {
        const { error, result } = await sql().delete('shelves').where('num', '=', req.body.num).execute();
        if (error) {
            throw error;
        }
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

module.exports = router;