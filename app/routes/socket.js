const route = require('express').Router();
const { server: appServer } = require('../app.js');
const { Server } = require('socket.io');
const { chatmodule } = require('./chat.js');
const io = new Server(appServer, { cors: { origin: '*' }, path: '/api/socket' });
io.on('connection', (socket) => {

    socket.on('join', (room) => {
        socket.join(room.room);
    });

    socket.on('leave', (room) => {
        socket.leave(room);
    });

    socket.on('message', async (body) => {

        const { query } = await chatmodule().insertJson(body);
        io.emit('message', body);
    })

    socket.on('deleteMessage', async (body) => {
        const { result, error } = await chatmodule().deleteJson(body);
        if (error || result.affectedRows <= 0) throw error;

        io.emit('deleteMessage', body);
    });

    socket.on('updateMessage', async (body) => {
        const { result, error } = await chatmodule().updateJson.message(body);
        if (error || result.affectedRows <= 0) throw error;

        io.emit('updateMessage', body);
    });



    socket.on('read', async (body) => {
        const { result, error } = await chatmodule().updateJson.read(body);
        if (error || result.affectedRows <= 0) throw error;

        io.emit('read', body);
    });

    socket.on('typing', (isTyping) => {
        io.emit('typing', isTyping);
    });
});
module.exports = route;