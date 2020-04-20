const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const  db = admin.firestore();

exports.startNewTurn = functions.https.onCall(async (data, context) => {
	await startNewTurn(data.roomId);

	return true;
});

async function startNewTurn(roomId) {
	
	console.log(`Starting new turn for room ${roomId}`);
	
	const roomDoc = db.collection('games').doc(String(roomId));
	const roomData = (await roomDoc.get()).data();
	
	// Replenish Cards

	const inNeedOfCards = await roomDoc.collection('users').where('numCardsInHand', '<', roomData.settings.cardsPerHand).get();

	console.log(`${inNeedOfCards.size} users are in need of cards in room ${roomId}`);

	let deckWhite = roomData.deckWhite;

	for(let i = 0; i < inNeedOfCards.size; i++) { // Get the card text for each card we're going to give, then give the cards.
		/* eslint-disable no-await-in-loop */

		const userDoc = inNeedOfCards.docs[i];
		const userDocRef = roomDoc.collection('users').doc(userDoc.id);
		const userData = userDoc.data();
		
		const numCardsNeeded = roomData.settings.cardsPerHand - userData.numCardsInHand;
		console.log(`User ${userDoc.id} needs ${numCardsNeeded} cards in room ${roomId}`);

		if(deckWhite.length < numCardsNeeded) console.error("Not enough white cards left!");

		const cardIdsToGive = deckWhite.slice(0, numCardsNeeded);
		let cardsToGive = [];
		const getCardTextPromises = cardIdsToGive.map(id => {
			return db.collection('cards').doc(id).get().then((snap) => {
				cardsToGive.push(snap.get('text'))
				return null; // To pass eslint
			});
		});
		await Promise.all(getCardTextPromises);

		deckWhite = deckWhite.filter(id => !cardIdsToGive.includes(id));
		
		try {
			await userDocRef.update({
				hand: admin.firestore.FieldValue.arrayUnion.apply(null, cardsToGive),
				numCardsInHand: admin.firestore.FieldValue.increment(cardsToGive.length)
			});
		} catch (error) {
			console.error(error);
		}
	}

	// Pick new black card

	let availableBlackCards = roomData.deckBlack;
	if(availableBlackCards.length < 1) throw new Error("No black cards left!");

	let blackCardId = availableBlackCards[Math.floor(Math.random() * availableBlackCards.length)];

	const newBlackCard = await db.collection('cards').doc(blackCardId).get().then((snap) => {return snap.data().text});

	// Pick new czar
	let oldCzar = roomData.currentCzar;
	let allPlayers = roomData.players;

	let newCzar = findNextCzar(oldCzar, allPlayers);

	await roomDoc.update({
		"deckWhite": deckWhite, // Update the deck to remove the cards we've just dealt
		"deckBlack": admin.firestore.FieldValue.arrayRemove(blackCardId), // Remove the black card we chose

		"currentBlackCard": newBlackCard, // Set the new black card
		"currentCzar": newCzar, // Set the new Czar

		"activeCards": [], // Remove the cards from the previous hand

		"turnStatus": "WAITING_FOR_CARDS", // So the users know what's going on
		"turnWinningCard": null // Reset the winning card
	}).catch(e => console.error(e));

	console.log(`New turn started successfully for room ${roomId}`);

	return;
}

function findNextCzar(currentCzar, allPlayers) {
  let currentCzarIndex = allPlayers.findIndex(user => user === currentCzar);

  if(currentCzarIndex === allPlayers.length-1 || currentCzar === null) {
  	currentCzarIndex = -1;
  }
  
  let newCzar = allPlayers[currentCzarIndex+1];
  
  return newCzar;
}

async function generateGameDecks(roomId, settings) {
	console.log(`Generating decks for room ${roomId}`);
	
	if(settings === null) {
		console.log(`No settings. Using all cards for room ${roomId}`);
	}
	
	let deckBlack = [];
	let deckWhite = [];
		
	await db.collection('cards').get().then(querySnapshot => {
		querySnapshot.forEach(cardDocSnapshot => {
			let cardType = cardDocSnapshot.data().cardType;

			if(cardType === "Q") deckBlack.push(cardDocSnapshot.id);
			if(cardType === "A") deckWhite.push(cardDocSnapshot.id);
		});

		return null; //
	})
	.catch(err => {
		console.error(`Error while generating decks for room ${roomId} :(`, err);
	});

	/* Shuffle the decks using Fisher-Yates shuffle algo */
	for (let i = deckBlack.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[deckBlack[i], deckBlack[j]] = [deckBlack[j], deckBlack[i]];
  }
	for (let i = deckWhite.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[deckWhite[i], deckWhite[j]] = [deckWhite[j], deckWhite[i]];
  }

	await db.collection('games').doc(String(roomId)).update({
		deckBlack: deckBlack,
		deckWhite: deckWhite
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
	
	await db.collection('games').doc(String(roomId)).update({
		gameState: "PLAYING"
	}).catch(err => console.log(err));
	
	return true;
});