// eslint-disable-next-line import/no-extraneous-dependencies
import { Socket } from 'socket.io';

Socket.on('Connection', (socket) => {
  console.log(`Auth value : ${socket.id}`);

  socket.on('sendNotification', (details) => {
    socket.broadcast.emit('sendNotification', details);
  });
});
