/**
 * @description File which runs the express
 * application.
 */

// Required Modules
const express = require('express');
const http = require('http');
const io = require('socket.io');
const morgan = require('morgan');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const passport = require('passport');

// Constants
const port = 3000
const dbConnectionUrl = 'postgres://postgres:@@Pudding34@localhost:5432/postgres';
const newEndUserRequestProps = [
  'email',
  'user_pw'
];
// Next variable is w/ respect to users endpoint requests
// Should be added to config file
const requirementsStageExpectedRequestProps = [
  'budget_min',
  'budget_max',
  'wedding_date',
  'church_name',
  'church_city',
  'venue_name',
  'venue_city',
  'additional_comments',
  'attendance_size'
];
// Next variable is w/ respect to portfolioAlbums endpoint requests
// Should be added to config file
const conversationsExpectedRequestProps = [
  'vendor_id',
  'user_id'
];

// Instances of module(s)
const app = express();
const httpServer = http.Server(app);
const socketIoLayer = io(httpServer);
const db = pgp(dbConnectionUrl);

// Dependency map
app.use(morgan('common'));
app.use(bodyParser.json());
app.use(express.static('dist'));
app.use('/albums', express.static(__dirname + '/albums'));
app.use(passport.initialize());
app.use(passport.session());

// Application end points

// Base
app.get('/', (req, res) => res.sendStatus(200));

/******************************************
 * User endpoints
 * 
 * @TODO Put endpoint is for creating new user? Where should requirements gathering information go?
 ******************************************/
/** 
 * User endpoints (get, post, put, delete)
 * 
 * Note: Right now, the user end points
 * contain no user name or anything. The database
 * that contains a table, users, with the data that simply 
 * has all of the requirements, which will be gathered in stage 1,
 * for the wedding, w/ user id in there.
 */
/**
 * @description 'Get' endpoint for a
 * a specific users entry.
 */
app.get('/users/:id', (req, res) => {
  const requestId = req.params.id;
  // Is this variable really needed? Probably not.
  const userId = !isNaN(requestId) ? parseInt(requestId) : null;
  
  if (userId !== null) {
    db.one('SELECT * FROM users WHERE id=($1)', [userId])
      .then((data) => {
        res.json(data);
      })
      .catch((error) => {
        console.error(error);
        res.sendStatus(400);
      });
  } else {
    res.sendStatus(400);
  }
});
/**
 * @description 'Post' endpoint for new
 * users.
 */
app.post('/users', (req, res) => {
  const validitityOfRequest = isValidRequest(req.body, newEndUserRequestProps);
  
  if (validitityOfRequest === true) {
    const unhashedPassword = req.body.user_pw;
    const userEmail = req.body.email;

    validateEmailUniqueness(userEmail)
    .then(() => {
      bcrypt.hash(unhashedPassword, 10)
          .then((hash) => {
            const queryIndexedVariablesParams = getQueryIndexedVariableParams(2);
            const queryParams = '(' + newEndUserRequestProps.join(', ') + ')';

            db.none('INSERT INTO users ' + queryParams + ' VALUES ' + queryIndexedVariablesParams + ';', [userEmail, hash])
              .then(() => {
                res.sendStatus(201);
              })
              .catch((error) => {
                console.error(error);
                res.sendStatus(400);
              });
          })
          .catch(error => {
            console.error(error);
            res.sendStatus(400);
          });
    })
    .catch(error => {
      console.error(error);
      res.sendStatus(400);
    });
  } else {
    res.sendStatus(400);
  }
});
/**
 * @description 'Put' endpoint for a
 * a specific users entry.
 *
 * @TODO Remove hack of having to concat the two arrays within end point
 * @TODO This does not properly handle putting passwords, for now putting passwords should have a different end point
 */
app.put('/users/:id', (req, res) => {
  // Note: This code (these two variable declarations)
  // are repeated from 'get' endpoint.
  const requestId = req.params.id;
  const userId = !isNaN(requestId) ? parseInt(requestId) : null;
  const userDataArray = requirementsStageExpectedRequestProps.concat(newEndUserRequestProps);
  const allReqPropsAreValid = validateRequestProps(req.body, userDataArray);

  if (userId !== null && allReqPropsAreValid) {
    validateUserExists(userId)
    .then(userExists => {
      if (userExists) {
        const queryAssignments = generateQueryAssignments(req.body);
        const idIndexParam = getNumIndexParams(req.body) + 1;
        const queryVals = getQueryValsFromRequest(req.body, userDataArray);
        
        // hack for getting id in there
        queryVals.push(userId);
        
        db.none('UPDATE users SET ' + queryAssignments + ' WHERE id=($' + idIndexParam + ');', queryVals)
          .then(() => {
            res.sendStatus(204);
          })
          .catch((error) => {
            console.error(error);
            res.sendStatus(400);
          });
      } else {
        res.sendStatus(400);  
      }
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(400);
    })
  } else {
    res.sendStatus(400);
  }
});
/**
 * @description Delete endpoint for wedding detail resources.
 */
app.delete('/users/:id', (req, res) => {
  // Note: This code (these two variable declarations)
  // are repeated from 'get' endpoint.
  const requestId = req.params.id;
  const userId = !isNaN(requestId) ? parseInt(requestId) : null;

  if (userId !== null) {
    db.none('DELETE FROM users WHERE id=($1)', [userId])
      .then(() => {
        res.sendStatus(204);
      })
      .catch(error => {
        console.error(error);
        res.sendStatus(400);
      })
  } else {
    res.sendStatus(400);
  }
});
// Conversations endpoints
/**
 * @description 'Get' endpoint for a
 * a specific convesations entry.
 */
app.get('/conversations/:id', (req, res) => {
  const requestId = req.params.id;
  // Is this variable really needed? Probably not.
  const conversationId = !isNaN(requestId) ? parseInt(requestId) : null;
  
  if (conversationId !== null) {
    db.many('SELECT * FROM conversations WHERE id=($1)', [conversationId])
      .then((data) => {
        res.json(data);
      })
      .catch((error) => {
        console.error(error);
        res.sendStatus(400);
      });
  } else {
    res.sendStatus(400);
  }
});
/**
 * @description 'Post' endpoint for a new
 * conversations entry. This one requires
 * that all valid properties exist within
 * request.
 */
app.post('/conversations', (req, res) => {
  const validitityOfRequest = isValidRequest(req.body, conversationsExpectedRequestProps);
  
  if (validitityOfRequest === true) {
    const queryParams = '(' + conversationsExpectedRequestProps.join(', ') + ')';
    const queryIndexedVariablesParams = getQueryIndexedVariableParams(conversationsExpectedRequestProps.length);
    const queryValues = getQueryValsFromRequest(req.body, conversationsExpectedRequestProps);
    db.none('INSERT INTO conversations ' + queryParams + ' VALUES ' + queryIndexedVariablesParams + ';', queryValues)
      .then(() => {
        res.sendStatus(201);
      })
      .catch((error) => {
        console.error(error);
        res.sendStatus(400);
      });
  } else {
    res.sendStatus(400);
  }
});


/**
 * @description Util function for getting
 * the number of indexed parameters for query strings (i.e. number
 * of key value pairs in request body). This is useful
 * for when needing use cases like the one in put
 * endpoint above.
 */
function getNumIndexParams(reqBody) {
  return Object.keys(reqBody).length;
}

/**
 * @description Util function which gets
 * the indexed variable parameters for
 * a query in pgp (e.g. ($1, $2....)).
 * 
 * @returns {String}
 */
function getQueryIndexedVariableParams(upperBoundNum) {
  let index = 1;
  let indexedVariableParams = '';

  while (index <= upperBoundNum) {
    let isLastIndex = index === upperBoundNum;
    if (!isLastIndex) {
      indexedVariableParams += '$' + index + ', ';
    } else {
      indexedVariableParams += '$' + index;
    }
    index += 1; 
  }

  return '(' + indexedVariableParams + ')';
}

/**
 * @description Util which returns an array. 
 * Each of those values map to
 * a column within the database, which need to be ordered
 * to be correctly inserted into DB.
 * 
 * @returns {Array} 
 */
function getQueryValsFromRequest(reqBody, expectedRequestProps) {
  let queryVals = [];

  for (let i = 0; i < expectedRequestProps.length; i++) {
    let expectedRequestProp = expectedRequestProps[i];
    let reqBodyValue = reqBody[expectedRequestProp];
    if (reqBodyValue !== undefined) {
      queryVals.push(reqBodyValue);
    }
  }

  return queryVals;
}

/**
 * @description Function which generates a string
 * of variable assignments mapped to new values (colum name -> new val).
 * This comes in handy for when generating dynamic queries for
 * put requests.
 * 
 * @returns {String}
 */
function generateQueryAssignments(reqBody) {
  const reqBodyProps = Object.keys(reqBody);
  const lengthOfReqBody = reqBodyProps.length;
  let queryAssignments = '';

  for (let i = 0; i < lengthOfReqBody; i++) {
    let prop = reqBodyProps[i];
    let isLastIndex = i === lengthOfReqBody - 1;
    let indexedVaribleParam = i + 1;
    queryAssignments += prop + '=($' + indexedVaribleParam + ')'; 
    if (!isLastIndex) {
      queryAssignments += ', ';
    }
  }

  return queryAssignments;
}

/**
 * @description Function which checks if a request
 * is valid or not by simply checking if all expected
 * properties are present in request object.
 * 
 * @returns {Boolean}
 */
function isValidRequest(requestObj, expectedRequestProps) {
  let isValidRequest = true;

  for (let expectedRequestProp of expectedRequestProps) {
    if (requestObj[expectedRequestProp] === undefined) {
      isValidRequest = false;
      break;
    }
  }

  return isValidRequest;
}
/**
 * @description Function which validates that
 * an email is unqiue within the database.
 * 
 * @TODO Horrible ugly hack, figure out a better way to do this
 * @TODO Consolidate this function with validateUserExists which is done more properly
 */
function validateEmailUniqueness(email) {
  return new Promise((resolve, reject) => {
    db.one('SELECT * FROM users WHERE email = ($1)', [email]).then(() => {
      reject();
    }).catch(() => {
      resolve();
    });
  })
}
/**
 * @description Function which checks if all
 * properties included in put request are valid.
 * This might be similar; assess later for
 * refactoring consolidation. As of right now
 * they are both different in that this one
 * is for a put request, which can have any combinations
 * of properties. Whereas post request requires ALL.
 * 
 * @returns {Boolean}
 */
function validateRequestProps(reqBody, validRequestProps) {
  const reqBodyKeys = Object.keys(reqBody);
  let isValid = true;

  for (let key of reqBodyKeys) {
    if (!validRequestProps.includes(key)) {
      isValid = false;
      break;
    }
  }

  return isValid;
}
/**
 * @description Function that checks
 * whether or not a user exists
 * within the database.
 * 
 * @returns {Promise}
 * 
 * @TODO Consolidate this function with validateEmailExists
 */
function validateUserExists(userId) {
  return new Promise((resolve, reject) => {
    db.manyOrNone('SELECT * FROM users WHERE id=($1);', [userId]).then((data) => {
      const userExists = data.length === 1;
      resolve(userExists);
    }).catch((error) => {
      reject(error);
    })
  });
}

// socket.io "endpoints" for prototype
// TODO: All events should be renamed
socketIoLayer.on('connection', (socket) => {
  console.log('a user has connected');

  socket.on('disconnect', () => {
    console.log('user has disconnected');
  });

  socket.on('message', (message) => {
    // Currently sending to all users
    // Should only do message it was sent
    // from
    addMessageToDB(message).then(() => {
      socket.emit('backend message', generateMockResponse());
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(400); // Is this even required?
    });
  });

  socket.on('initializeChat', (data) => {
    // Data from client event
    const userId = data.userId;
    const vendorId = data.vendorId;

    // Variables used for sending back to user
    const value = generateMockResponse(); // Should send a welcoming/hello message

    // Object used for storing message in DB
    const message = { userId, vendorId, value };

    // Below it should store the message in DB after successfully sending it
    socket.emit('backend message - initial', value);

    // Add to database (this is incorrect, but okay for now)
    addMessageToDB(message).catch(error => {
      console.log(error);
      res.sendStatus(400);
    });
  });

  socket.on('understand expectations', () => {
    // HACK! This should be moved later on
    getAlbumPicMessageData().then(data => {
      socket.emit('backend album pic message', data);
    }).catch(error => {
      console.log(error);
    });
  })
});

// Utils for socket.io initial prototype

function addMessageToDB(messageObj) {
  const message = messageObj.value;
  const userId = messageObj.userId;
  const vendorId = messageObj.vendorId;
  // The next two variables should be dynamic like
  // other non-socket endpoints
  // (BAD!)
  const queryParams = '(message, user_id, vendor_id)';
  const queryParameterIndexes = '($1, $2, $3)';

  // db referneces global variable (BAD!)
  return db.none('INSERT INTO messages ' + queryParams + ' VALUES ' + queryParameterIndexes + ';', [message, userId, vendorId]);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return [year,
    (month > 9 ? '' : '0') + month,
    (day > 9 ? '' : '0') + day
   ].join('-');
}

function getAlbumPicMessageData() {
  return new Promise((resolve, reject) => {
    db.one('SELECT * FROM image_urls INNER JOIN albums ON image_urls.album_id = albums.id;')
      .then(data => {
        const albumName = data.album_name;
        const albumDate = formatDate(data.album_date);
        const imageUrl = data.image_url;

        resolve({ albumData: { albumName, albumDate }, imageUrl });
      })
      .catch(error => {
        reject(error);
      });
  });
}

function generateMockResponse() {
  const responses = [
    'Hello from, this is back end',
    'This is a mock response',
    'I am generated by a simple function',
    'I am not smart enough to understand you yet'
  ];

  // Get random response
  return responses[Math.floor(Math.random()*responses.length)];
}

// Code which starts server
httpServer.listen(port, () => console.log(`Example app listening on port ${port}!`));