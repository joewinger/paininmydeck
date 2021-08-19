const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const  db = admin.firestore();

const startNewTurn = require('./startNewTurn');
const startGame = require('./startGame');
const createRoom = require('./createRoom');

exports.startNewTurn = functions.https.onCall((data, context) => startNewTurn.handler(data, context, db, admin));

exports.startGame = functions.https.onCall((data, context) => startGame.handler(data, context, db, admin));

exports.createRoom = functions.https.onCall((data, context) => createRoom.handler(data, context, db));