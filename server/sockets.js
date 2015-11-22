// # Socket Connection Handler

// ##### [Back to Table of Contents](./tableofcontents.html)

// Import board model from [board.js](../documentation/board.html)
var Board = require('../db/board');

// **boardUrl:** *String* <br>
// **board:** *Mongoose board model* <br>
// **io:** *Export of our Socket.io connection from [server.js](../documentation/server.html)*
var connect = function(boardUrl, board, io) {
  // Set the Socket.io namespace to the boardUrl.
  var whiteboard = io.of(boardUrl);

  whiteboard.once('connection', function(socket) {
    // Send the current state of the board to the client immediately on joining.
    socket.emit('join', board);

    socket.on('start', function(pen) {

      // **A stroke is essentially a continous line drawn by the user.**
      socket.stroke = {
        pen: pen,
        path: []
      };
    });

    socket.on('drag', function(coords) {
      //Push coordinates into the stroke's drawing path.
      socket.stroke.path.push(coords);
      // This payload will be sent back to all sockets *except the socket
      // that initiated the draw event.*
      var payload = {
        pen: socket.stroke.pen,
        coords: coords
      };

      //Broadcast new line coords to everyone but the person who drew it.
      socket.broadcast.emit('drag', payload);
    });

    //When stroke is finished, add it to our db.
    socket.on('end', function(data) {
      //Get the board that the socket is connected to.
      var id = socket.nsp.name.slice(1);

      console.log('we are in the end now');
      if (socket.stroke && socket.stroke.pen.strokeStyle === 'textBox') {
        var finishedStroke = data;
      } else {
        var finishedStroke = socket.stroke;
      }
        //Update the board with the new stroke.
        Board.boardModel.update({id: id},{$push: {strokes: finishedStroke} },{upsert:true},function(err, board){
          if(err){ console.log(err); }
          else {
            console.log("Successfully added");
          }
        });


      // Emit end event to everyone but the person who stopped drawing.
      socket.broadcast.emit('end', null);

      //Delete the stroke object to make room for the next stroke.
      delete socket.stroke;
    });
  });
};

// Required by [server.js](../documentation/server.html)
module.exports = connect;
