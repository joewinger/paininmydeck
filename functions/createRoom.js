const admin = require('firebase-admin');
const DEFAULT_DOCS = {
  'room': {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    gameState: 'LOBBY',   // 'PLAYING', 'FINISHED'
    users: {},            // { <username>: { colorSet[], points, czarOrder }, ... }
    settings: {
      pointsToWin: 10,
      cardsPerHand: 7,
      numBlankCards: 0,   // Blanks floating in the deck
			guaranteedBlanks: 0,// Guaranteed blanks everyone starts with
			familyMode: false,  // Don't use any cards marked as obscene, offensive, or sexual
      allBlanks: false,
			public: true,
			numRedraws: 4
    },
    turn: {
      round: 0,
      status: null,       // 'WAITING_FOR_CARDS', 'WAITING_FOR_CZAR', 'WAITING_FOR_NEXT_TURN'
      questionCard: null, // Card text
      czar: null,         // Username
      playedCards: [],    // [ { text, playedBy }, ... ]
      winningCard: {
        text: null, 
        playedBy: null
      }
    },
    winner: null          // Username
  },
  'chat': {
    chatMessages: []
  },
  'decks': {
    questionDeck: [],
    answerDeck: []
  },
	'history': {
		rounds: []
	}
};

exports.handler = async function(data, context, db) {
	let handleError = (err) => {
		console.error(err);
		return false;
	};

	const roomId = await generateRoomId(db);

	await db.doc(`games/${roomId}`).set(DEFAULT_DOCS['room']).catch(err => handleError(err));
	await db.doc(`games/${roomId}/meta/chat`).set(DEFAULT_DOCS['chat']).catch(err => handleError(err));
	await db.doc(`games/${roomId}/meta/decks`).set(DEFAULT_DOCS['decks']).catch(err => handleError(err));
	await db.doc(`games/${roomId}/meta/history`).set(DEFAULT_DOCS['history']).catch(err => handleError(err));

	return roomId;
}

function generateRoomId(db) {
	return new Promise((resolve, reject) => {

		let max = Math.floor(9999);
		let roomId = Math.floor(Math.random() * (max + 1)).toString().padStart(4, 0); // '53' => '0053'

		fetchAllRooms(db).then(allRooms => {
			
			if (allRooms.length === max) return reject(new functions.https.HttpsError('resource-exhausted', 'Every possible room ID is taken.'));

			while (allRooms.includes(roomId)) { // This room ID is already in use
				roomId = Math.floor(Math.random() * (max + 1)).toString().padStart(4, 0);
			}

			return resolve(roomId);

		}).catch(err => {
			console.error(err);
			return reject(err);
		});
	});
}

function fetchAllRooms(db) {
	return new Promise((resolve, reject) => {
		let rooms = [];

		db.collection('games').get().then(querySnapshot => {
			querySnapshot.forEach((room) => {
				rooms.push(room.id);
			});

			return true;
		}).then(() => {
			return resolve(rooms);
		}).catch((err) => {
			reject(err);
		});
	});
}