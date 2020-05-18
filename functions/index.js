const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const  db = admin.firestore();

const DEFAULT_ROOM_DOCUMENT = {
	timestamp: admin.firestore.FieldValue.serverTimestamp(),
	gameState: 'LOBBY',   // 'PLAYING', 'FINISHED'
	users: {},          // { 'username': { colorSet[], points }, ... }
	settings: {           //
		pointsToWin: 10,    //
		cardsPerHand: 7     //
	},                    //
	turn: {               //
		round: 0,           //
		status: null,       // 'WAITING_FOR_CARDS', 'WAITING_FOR_CZAR', 'WAITING_FOR_NEXT_TURN'
		questionCard: null, // Card text
		czar: null,         // Username
		playedCards: [],    // [ { text, playedBy }, ... ]
		winningCard: {
			text: null, 
			playedBy: null
		}
	},
	winner: null           // Username
};

const DEFAULT_CHAT_DOCUMENT = {
	chatMessages: []
};

const DEFAULT_DECKS_DOCUMENT = {
	questionDeck: [],
	answerDeck: []
}

exports.startNewTurn = functions.https.onCall(async (data, context) => {
	await startNewTurn(data.roomId);

	return true;
});

async function startNewTurn(roomId) {
	
	console.log(`Starting new turn for room ${roomId}`);
	
	const roomDoc = db.doc(`games/${roomId}`);
	const roomData = (await roomDoc.get()).data();

	const decks = (await db.doc(`games/${roomId}/meta/decks`).get()).data();
	
	// Replenish Cards

	const inNeedOfCards = await roomDoc.collection('users').where('numCardsInHand', '<', roomData.settings.cardsPerHand).get();

	console.log(`${inNeedOfCards.size} users are in need of cards in room ${roomId}`);

	let answerDeck = decks.answerDeck;

	for(let i = 0; i < inNeedOfCards.size; i++) { // Get the card text for each card we're going to give, then give the cards.
		/* eslint-disable no-await-in-loop */

		const userDoc = inNeedOfCards.docs[i];
		const userDocRef = roomDoc.collection('users').doc(userDoc.id);
		const userData = userDoc.data();
		
		const numCardsNeeded = roomData.settings.cardsPerHand - userData.numCardsInHand;
		console.log(`User ${userDoc.id} needs ${numCardsNeeded} cards in room ${roomId}`);

		if(answerDeck.length < numCardsNeeded) console.error("Not enough answer cards left!");

		const cardsToGive = answerDeck.slice(0, numCardsNeeded);

		answerDeck = answerDeck.filter(card => !cardsToGive.includes(card));
		
		try {
			await userDocRef.update({
				hand: admin.firestore.FieldValue.arrayUnion(...cardsToGive),
				numCardsInHand: admin.firestore.FieldValue.increment(cardsToGive.length)
			});
		} catch (error) {
			console.error(error);
		}
	}

	// Pick new question card

	let questionDeck = decks.questionDeck;

	if(questionDeck.length < 1) throw new Error("No question cards left!");

	const newQuestionCard = questionDeck[Math.floor(Math.random() * questionDeck.length)];

	// Pick new czar
	let oldCzar = roomData.turn.czar;
	let allUsers = Object.keys(roomData.users);

	let newCzar = findNextCzar(oldCzar, allUsers);

	await db.doc(`games/${roomId}/meta/decks`).update({		
		'answerDeck': answerDeck, // Update the deck to remove the cards we've just dealt
		'questionDeck': admin.firestore.FieldValue.arrayRemove(newQuestionCard),
	});

	await roomDoc.update({
		'turn.round': admin.firestore.FieldValue.increment(1),
		'turn.status': 'WAITING_FOR_CARDS',
		'turn.questionCard': newQuestionCard,
		'turn.czar': newCzar,
		'turn.playedCards': [],
		'turn.winningCard': null
	}).catch(e => console.error(e));

	console.log(`New turn started successfully for room ${roomId}`);

	return;
}

function findNextCzar(currentCzar, allUsers) {
  let currentCzarIndex = allUsers.findIndex(user => user === currentCzar);

  if(currentCzarIndex === allUsers.length-1 || currentCzar === null) {
  	currentCzarIndex = -1;
  }
  
  let newCzar = allUsers[currentCzarIndex+1];
  
  return newCzar;
}

async function generateGameDecks(roomId, settings) {
	console.log(`Generating decks for room ${roomId}`);
	
	if(settings === null) {
		console.log(`No settings. Using all cards for room ${roomId}`);
	}
	
	let questionDeck = [];
	let answerDeck = [];
		
	await db.collection('cards').get().then(querySnapshot => {
		querySnapshot.forEach(cardDocSnapshot => {
			let cardType = cardDocSnapshot.data().cardType;

			if(cardType === "Q") questionDeck.push(cardDocSnapshot.get('text'));
			if(cardType === "A") answerDeck.push(cardDocSnapshot.get('text'));
		});

		return null; //
	})
	.catch(err => {
		console.error(`Error while generating decks for room ${roomId} :(`, err);
	});

	/* Shuffle the decks using Fisher-Yates shuffle algo */
	for (let i = questionDeck.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[questionDeck[i], questionDeck[j]] = [questionDeck[j], questionDeck[i]];
  }
	for (let i = answerDeck.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[answerDeck[i], answerDeck[j]] = [answerDeck[j], answerDeck[i]];
  }

	await db.doc(`games/${roomId}/meta/decks`).update({
		questionDeck: questionDeck,
		answerDeck: answerDeck
	})
	.catch(err => {
		console.error(`Error while writing decks for room ${roomId} :(`, err);
	});

	console.log(`Successfully wrote decks for room ${roomId}`);

	return;
}

exports.startGame = functions.https.onCall(async (data, context) => {
	let roomId = data.roomId;

	console.log(`Starting game for room ${roomId}`);

	await generateGameDecks(roomId, null);
	await startNewTurn(roomId);
	
	await db.doc(`games/${roomId}`).update({
		gameState: "PLAYING"
	}).catch(err => console.log(err));
	
	return true;
});

exports.createRoom = functions.https.onCall(async (data, context) => {
	
	let handleError = (err) => {
		console.error(err);
		return false;
	};

	const roomId = await generateRoomId();

	await db.doc(`games/${roomId}`).set(DEFAULT_ROOM_DOCUMENT).catch(err => handleError(err));
	await db.doc(`games/${roomId}/meta/chat`).set(DEFAULT_CHAT_DOCUMENT).catch(err => handleError(err));
	await db.doc(`games/${roomId}/meta/decks`).set(DEFAULT_DECKS_DOCUMENT).catch(err => handleError(err));

	return roomId;
});

function fetchAllRooms() {
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

function generateRoomId() {
	return new Promise((resolve, reject) => {

		let max = Math.floor(9999);
		let roomId = Math.floor(Math.random() * (max + 1)).toString().padStart(4, 0); // '53' => '0053'

		fetchAllRooms().then(allRooms => {
			
			if(allRooms.length === max) return reject(new functions.https.HttpsError('resource-exhausted', 'Every possible room ID is taken.'));

			while(allRooms.includes(roomId)) { // This room ID is already in use
				roomId = Math.floor(Math.random() * (max + 1)).toString().padStart(4, 0);
			}

			return resolve(roomId);

		}).catch(err => {
			console.error(err);
			return reject(err);
		});
	});
}