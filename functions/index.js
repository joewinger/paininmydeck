const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const  db = admin.firestore();

const DEFAULT_ROOM_DOCUMENT = {
	timestamp: admin.firestore.FieldValue.serverTimestamp(),
	gameState: 'LOBBY',   // 'PLAYING', 'FINISHED'
	users: {},            // { 'username': { colorSet[], points }, ... }
	settings: {
		pointsToWin: 10,
		cardsPerHand: 7,
		numBlankCards: 0,
		allBlanks: false,
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
	
	// Set our references
	const roomDoc = db.doc(`games/${roomId}`);
	const roomData = (await roomDoc.get()).data();
	const decks = (await db.doc(`games/${roomId}/meta/decks`).get()).data();
	
	// Replenish Cards ///////////////////////////////////////////////////////////////

	// Find everyone who's missing cards
	const usersInNeedOfCards = await roomDoc.collection('users').where('numCardsInHand', '<', roomData.settings.cardsPerHand).get();
	console.log(`${usersInNeedOfCards.size} users are in need of cards in room ${roomId}`);

	// Set our reference to use later
	let answerDeck = decks.answerDeck;

	// Loop through each user in need of cards & give them cards
	for(let i = 0; i < usersInNeedOfCards.size; i++) {
		/* eslint-disable no-await-in-loop */

		// Set our references to make things easy
		const userDoc = usersInNeedOfCards.docs[i];
		const userDocRef = roomDoc.collection('users').doc(userDoc.id);
		const userData = userDoc.data();
		
		// Figure out how many cards this user needs
		const numCardsNeeded = roomData.settings.cardsPerHand - userData.numCardsInHand;
		console.log(`User ${userDoc.id} needs ${numCardsNeeded} cards in room ${roomId}`);

		// Make sure we have enough cards left - TODO: handle this better/let the user know what's happening
		if(answerDeck.length < numCardsNeeded) console.error("Not enough answer cards left!");

		// Take the cards we need off the top of the deck
		const cardsToGive = answerDeck.slice(0, numCardsNeeded);

		// Remove the cards we took from the deck
		answerDeck = answerDeck.filter(card => !cardsToGive.includes(card));
		
		// Update the user document to reflect the cards being in our hand
		try {
			await userDocRef.update({
				hand: admin.firestore.FieldValue.arrayUnion(...cardsToGive),
				numCardsInHand: admin.firestore.FieldValue.increment(cardsToGive.length)
			});
		} catch (error) {
			console.error(error);
		}
	}

	// End Card Replenishment ////////////////////////////////////////////////////////

	// Select a New Question Card ////////////////////////////////////////////////////

	// Set our reference
	let questionDeck = decks.questionDeck;

	// Make sure we have question cards left
	if(questionDeck.length < 1) throw new Error("No question cards left!");

	// Randomly select a new question card
	const newQuestionCard = questionDeck[Math.floor(Math.random() * questionDeck.length)];

	// End Question Card Selection ///////////////////////////////////////////////////

	// Select New Czar ///////////////////////////////////////////////////////////////

	let oldCzar = roomData.turn.czar;
	let allUsers = Object.keys(roomData.users);

	let newCzar = findNextCzar(oldCzar, allUsers);

	// End Selection of New Car //////////////////////////////////////////////////////

	// Commit All of Our Updates /////////////////////////////////////////////////////

	// Update decks document to reflect the cards we've just dealt
	await db.doc(`games/${roomId}/meta/decks`).update({
		'answerDeck': answerDeck,
		// Remove the question card we selected from the deck
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

/**
 * Select the next czar in line
 * @param {string} currentCzar - username of current czar
 * @param {array} allUsers - list of every user in the game
 * 
 * @returns {string} username of the next czar in line
 */
function findNextCzar(currentCzar, allUsers) {
	// Find the index of the current czar in the list of all users
  let currentCzarIndex = allUsers.findIndex(user => user === currentCzar);

	// If our current czar is at the end of the list (or if we don't have a czar
	// yet), reset the index so we select the first user in the array
  if(currentCzarIndex === allUsers.length-1 || currentCzar === null) {
  	currentCzarIndex = -1;
  }
	
	// Select the next czar
  let newCzar = allUsers[currentCzarIndex+1];
  
  return newCzar;
}

async function generateGameDecks(roomId, settings = { numBlankCards: 0, allBlanks: false }) {
	console.log(`Generating decks for room ${roomId}`);
	
	if(settings === null) {
		console.log(`No settings. Using all cards for room ${roomId}`);
	}

	let questionDeck = [];
	let answerDeck = [];
	
	// Make the text '%BLANK% #' to make them each unique,
	// because firestore.FieldValue.arrayUnion() removes dups
	let numBlanks = settings.allBlanks ? 500 : settings.numBlankCards
	for (let i = 0; i < numBlanks; i++) answerDeck.push(`%BLANK% ${i+1}`);

	await db.collection('cards').get().then(querySnapshot => {
		querySnapshot.forEach(cardDocSnapshot => {
			let cardType = cardDocSnapshot.data().cardType;

			if(cardType === "Q") questionDeck.push(cardDocSnapshot.get('text'));
			if(cardType === "A" && !settings.allBlanks) answerDeck.push(cardDocSnapshot.get('text'));
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
	if (!settings.allBlanks) { // No need to shuffle if they're all blank
		for (let i = answerDeck.length - 1; i > 0; i--) {
			let j = Math.floor(Math.random() * (i + 1));
			[answerDeck[i], answerDeck[j]] = [answerDeck[j], answerDeck[i]];
		}
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

	let settings = await (await db.doc(`games/${roomId}`).get()).get('settings');

	await generateGameDecks(roomId, settings);
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