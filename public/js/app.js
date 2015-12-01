// # App Setup

// ##### [Back to Table of Contents](./tableofcontents.html)


// Set up app properties.

var App = {};

App.init = function() {
  // Connect to sockets.io with unique ioRoom ID - either a new whiteboard or used and saved previously by [sockets.js](../docs/sockets.html)
  var ioRoom = window.location.href;
  App.socket = io(ioRoom);


  //**Video Chat Functionality**

  // Create a video chat Object.
  var webrtc = new SimpleWebRTC({
    // **localVideoEl**: the ID/element DOM element that will hold the current user's video
    localVideoEl: 'localVideo',
    // **remoteVideosEl**: the ID/element DOM element that will hold remote videos
    remoteVideosEl: 'remoteVideos',
    // **autoRequestMedia**: immediately ask for camera access
    autoRequestMedia: true
  });

  // The room name is the same as our socket connection.
  webrtc.on('readyToCall', function() {
    webrtc.joinRoom(ioRoom);
  });

  // **Whiteboard**

  // Set properties of the whiteboard.
  App.canvas = $('#whiteboard');
  App.canvas[0].width = window.innerWidth;
  App.canvas[0].height = window.innerHeight * 0.9;
  App.context = App.canvas[0].getContext("2d");

  // Set properties of the mouse click.
  App.mouse = {
    click: false,
    drag: false,
    x: 0,
    y: 0
  };

  // Initialize pen properties.
  // To add more new drawing features, i.e. different colours, thickness, add them to the ```App.pen``` object.
  App.pen = {
    fillStyle: 'solid',
    strokeStyle: "black",
    lineWidth: 5,
    lineCap: 'round'
  };

  // ```App.isAnotherUserActive``` is a Boolean that signals whether another user is currently drawing. The current implementation is such that only 1 user can draw at a time, i.e. simultaneous drawing is forbidden. To get rid of this functionality, remove  ```App.isAnotherUserActive``` and conditional loops that require it.
  App.isAnotherUserActive = false;

  // ```App.stroke``` is an array of [x,y] coordinates for one drawing element. They are stored here, emitted ([in initialize.js](../docs/initialize.html)), and sent to [sockets.js](../docs/sockets.html). Once sent, ```App.stroke``` is emptied.
  App.stroke = [];

  // ```App.prevPixel``` contains only 1 [x,y] coordinate pair - the coordinates of the previous pixel drawn. This is used in ```App.socket.on('drag'...``` for smooth rendering of drawn elements by other users.
  App.prevPixel = [];


  // **Methods**


  // Draw according to coordinates.
  App.draw = function(x, y) {
    App.context.lineTo(x, y);
    App.context.stroke();
  };

  // Initialize before drawing: copy pen properties to ```App.context```, beginPath and set the starting coordinates to ```moveToX``` and ```moveToY```.
  App.initializeMouseDown = function(pen, moveToX, moveToY) {

    // Copy over current pen properties (e.g. fillStyle).
    for (var key in pen) {
      App.context[key] = pen[key];
    }

    var ctx = App.context;

    //check if textbox pen has been selected
    if (pen.strokeStyle === 'olive') {

      //TODO: Handle App.isAnotherUserActive functionality with respect to this feature

      //if it has, change strokeStyle to 'textBox' so further clicks do not create text box fields
      pen.strokeStyle = 'textBox';

      // CanvasInput -- http://goldfirestudios.com/blog/108/CanvasInput-HTML5-Canvas-Text-Input

      //make CanvasInput Field
      var input = new CanvasInput({
        canvas: document.getElementById('whiteboard'),
        x: moveToX,
        y: moveToY,
        borderWidth: 0,
        innerShadow: 'none',
        boxShadow: 'none',
        backgroundColor: 'white',
        borderColor: 'white',
        placeHolder: 'new text box',
        fontSize: 19,
        width: 400,
        height: 17,
        onsubmit: function() {
          //on submit turn textbox into a png url
          var image = input.renderCanvas().toDataURL("imgae/png");
          //send url and location to other sockets
          App.socket.emit('endText', {image:image, coords:[moveToX, moveToY]});
          //remove text entry field
          input.destroy();
        },
        onkeyup: function() {
          //similar to above, less the destroy().  Live updates other users with text as it is being typed
          var image = input.renderCanvas().toDataURL("imgae/png");
          //send url and location to other sockets
          App.socket.emit('type', {image:image, coords:[moveToX, moveToY]});
        }
      })
    } else {
      // Begin draw.
      App.context.beginPath();
      App.context.moveTo(moveToX, moveToY);
    }
  };



  // **Socket events**

  // Draw the board upon join.
  App.socket.on('join', function(board) {
    console.log("Joining the board.");

    // Check for null board data.
    if (board) {
      for (var i = 0; i < board.strokes.length; i++) {
        // Check for null stroke data.
        if (board.strokes[i]) {
          //check if a textBox is the current element
          if (board.strokes[i].image) {
            //make an image tag and set it's src to the text image
            var img = new Image;
            img.src = board.strokes[i].image;
            //draw image onto the canvas
            App.context.drawImage(img, board.strokes[i].coords[0], board.strokes[i].coords[1]);
          } else {
            // Set pen and draw path.
            var strokesArray = board.strokes[i].path;
            var penProperties = board.strokes[i].pen;
            //check if path exists (maybe unecessary after refactoring initialize.js to not drag when using text box)
            if (strokesArray.length >= 1) {
              App.initializeMouseDown(penProperties, strokesArray[0][0], strokesArray[0][1]);

              // Draw the path according to the strokesArray (array of coordinate tuples).
              for (var j = 0; j < strokesArray.length; j++) {
                App.draw(strokesArray[j][0], strokesArray[j][1]);
              }
              App.context.closePath();
            }
          }
        }
      }
    }
  });

  App.socket.on('undo', function(board) {
    // Check for null board data.
    if (board) {

      //clear board before re-rendering it
      App.context.clearRect(0, 0, App.canvas.width(), App.canvas.height());

      //re-render board
      for (var i = 0; i < board.strokes.length; i++) {
        // Check for null stroke data.
        if (board.strokes[i]) {
          //check if a textBox is the current element
          if (board.strokes[i].image) {
            //make an image tag and set it's src to the text image
            var img = new Image;
            img.src = board.strokes[i].image;
            //draw image onto the canvas
            App.context.drawImage(img, board.strokes[i].coords[0], board.strokes[i].coords[1]);
          } else {
            // Set pen and draw path.
            var strokesArray = board.strokes[i].path;
            var penProperties = board.strokes[i].pen;
            //check if path exists (maybe unecessary after refactoring initialize.js to not drag when using text box)
            if (strokesArray.length >= 1) {
              App.initializeMouseDown(penProperties, strokesArray[0][0], strokesArray[0][1]);

              // Draw the path according to the strokesArray (array of coordinate tuples).
              for (var j = 0; j < strokesArray.length; j++) {
                App.draw(strokesArray[j][0], strokesArray[j][1]);
              }
              App.context.closePath();
            }
          }
        }
      }
    }
  })


  // If another user is drawing, App.socket will receive a 'drag' event. App listens for the drag event and renders the drawing element created by the other user.
  // Note that App prevents the current user from drawing while the other user is still drawing.
  App.socket.on('drag', function(data) {
    App.isAnotherUserActive = true;
    console.log("Receiving data from another user:", data);

    // ```App.prevPixel``` is an array of the previous coordinates sent, so drawing is smoothly rendered across different browsers.
    // If the ```App.prevPixel``` array is empty (i.e., this is the first pixel of the drawn element), then prevPixel is set as the coordinates of the current mouseclick.
    if (App.prevPixel.length === 0) {
      App.prevPixel = data.coords;
    }


    // Initialize beginning coordinates and drawing.
    App.initializeMouseDown(data.pen, App.prevPixel[0], App.prevPixel[1]);
    App.draw(data.coords[0], data.coords[1]);

    // Set the current coordinates as App.prevPixel, so the next pixel rendered will be smoothly drawn from these coordinate points to the next ones.
    App.prevPixel = data.coords;

  });

  // When the user has mouseup (and finished drawing) then ```App.prevPixel``` will be emptied.
  App.socket.on('end', function() {
    App.prevPixel = [];
    App.context.closePath();
    App.isAnotherUserActive = false;
  });

  //if someone is typing in a textbox or submits a text box
  App.socket.on('endText', function(data) {

    //make an image tag and set it's src to the text image
    var img = new Image;

    img.src = data.image;

    //draw image onto the canvas after loading it
    img.onload = function() {
      App.context.drawImage(img, data.coords[0], data.coords[1]);
      App.isAnotherUserActive = false;
    }

  });

  // when someone clicks rewind button
  App.socket.on('rewind', function(board, val) {
    if (board) {
      //clear board before replaying it
      App.context.clearRect(0, 0, App.canvas.width(), App.canvas.height());
      //detect how much of the board the user wants to replay
      var playbackStartValue = Math.floor(board.strokes.length*(val/100));
      //start board at correct point
      for (var i = 0; i < playbackStartValue; i++) {
        // Check for null stroke data.
        if (board.strokes[i]) {
          //check if a textBox is the current element
          if (board.strokes[i].image) {
            //make an image tag and set it's src to the text image
            var img = new Image;
            img.src = board.strokes[i].image;
            //draw image onto the canvas
            App.context.drawImage(img, board.strokes[i].coords[0], board.strokes[i].coords[1]);
          } else {
            // Set pen and draw path.
            var strokesArray = board.strokes[i].path;
            var penProperties = board.strokes[i].pen;
            //check if path exists (maybe unecessary after refactoring initialize.js to not drag when using text box)
            if (strokesArray.length >= 1) {
              App.initializeMouseDown(penProperties, strokesArray[0][0], strokesArray[0][1]);

              // Draw the path according to the strokesArray (array of coordinate tuples).
              for (var j = 0; j < strokesArray.length; j++) {
                App.draw(strokesArray[j][0], strokesArray[j][1]);
              }
              App.context.closePath();
            }
          }
        }
      }

      //add back one stroke at a time until all are back
      var speedOfReplay = 1000; // time per stroke
      (function fastForward (i) {
         setTimeout(function () {
            // Check for null stroke data.
            if (board.strokes[i]) {
              //check if a textBox is the current element
              if (board.strokes[i].image) {
                //make an image tag and set it's src to the text image
                var img = new Image;
                img.src = board.strokes[i].image;
                //draw image onto the canvas
                App.context.drawImage(img, board.strokes[i].coords[0], board.strokes[i].coords[1]);
              } else {
                // Set pen and draw path.
                var strokesArray = board.strokes[i].path;
                var penProperties = board.strokes[i].pen;
                //check if path exists (maybe unecessary after refactoring initialize.js to not drag when using text box)
                if (strokesArray.length >= 1) {
                  App.initializeMouseDown(penProperties, strokesArray[0][0], strokesArray[0][1]);

                  // Draw the path according to the strokesArray (array of coordinate tuples).
                  for (var j = 0; j < strokesArray.length; j++) {
                    App.draw(strokesArray[j][0], strokesArray[j][1]);
                  }
                  App.context.closePath();
                }
              }
            }
            if (++i < board.strokes.length) fastForward(i);  // recursively call fastforward until all strokes have been rendered
         }, speedOfReplay)
      })(playbackStartValue);

      //when replay is finished, set user as no longer active
    }
    //handle case of no strokes on board
    board = board || {strokes: []}
    setTimeout(function() {
      App.isAnotherUserActive = false;
    }, ((board.strokes.length - playbackStartValue) * speedOfReplay))
  })

  //related rewind stuff to be moved into initialize later after merge
  $('.inline').on('change', function() {
    //set user as active so multiple replays cannot run in concert
    if (!App.isAnotherUserActive) {
      App.isAnotherUserActive = true;
      App.socket.emit('rewind', this.value);
    }
  });


  // when someone clicked clear board
  App.socket.on('clearDone', function() {
    //clear the board
    App.context.clearRect(0, 0, App.canvas.width(), App.canvas.height());
  });

};
