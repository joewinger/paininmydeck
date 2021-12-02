const admin = require('firebase-admin');

exports.handler = async function(data, context, db, admin) {
	const roomId = data.roomId;

	console.log(`Starting new turn for room ${roomId}`);
	
	// Set our references
	const roomDoc = db.doc(`games/${roomId}`);

  const roomData = (await roomDoc.get()).data();
	const decks = (await db.doc(`games/${roomId}/meta/decks`).get()).data();

	const promoPhotoMode = roomData.settings._promoPhotoMode === true;

	// Append Round Data to History Doc //////////////////////////////////////////////

	db.doc(`games/${roomId}/meta/history`).update({
		'rounds': admin.firestore.FieldValue.arrayUnion(
			roomData.turn.round === 0 ? null : {
			'round': roomData.turn.round,
			'question': roomData.turn.questionCard,
			'czar': roomData.turn.czar,
			'winningAnswer': roomData.turn.winningCard ? roomData.turn.winningCard.text : null, // In case we manually call this for debugging & there is no winning card yet
			'winningPlayer': roomData.turn.winningCard ? roomData.turn.winningCard.playedBy : null,
			'otherAnswers': roomData.turn.playedCards.filter(card => card.playedBy !== (roomData.turn.winningCard ? roomData.turn.winningCard.playedBy : false))
		})
	});
	
	// Replenish Cards ///////////////////////////////////////////////////////////////

	// Find everyone who's missing cards
	const usersInNeedOfCards = await (promoPhotoMode ? roomDoc.collection('users') : roomDoc.collection('users').where('numCardsInHand', '<', roomData.settings.cardsPerHand)).get();
	console.log(`${usersInNeedOfCards.size} users are in need of cards in room ${roomId}`);

	// Set our reference to use later
	let answerDeck = decks.answerDeck;

	// Loop through each user in need of cards & give them cards
	for (let i = 0; i < usersInNeedOfCards.size; i++) {
		/* eslint-disable no-await-in-loop */

		// Set our references to make things easy
		const userDoc = usersInNeedOfCards.docs[i];
		const userDocRef = roomDoc.collection('users').doc(userDoc.id);
		const userData = userDoc.data();
		
		// Figure out how many cards this user needs
		let numCardsNeeded = promoPhotoMode ? roomData.settings.cardsPerHand : roomData.settings.cardsPerHand - userData.numCardsInHand;
		console.log(`User ${userDoc.id} needs ${numCardsNeeded} cards in room ${roomId}`);

		let cardsToGive = []; // The array of cards we'll add to the player's hand
		let reserveCards = null;

		if (roomData.turn.round === 0) { // If this is the first draw
			numCardsNeeded -= roomData.settings.guaranteedBlanks;
			for (let i = 0; i < roomData.settings.guaranteedBlanks; i++) {
				cardsToGive.push(`%BLANK% Guaranteed ${i+1}`);
			}

			// Track our reserve cards & remove them from the deck
			reserveCards = answerDeck.slice(0, roomData.settings.numRedraws);
			answerDeck = answerDeck.filter(card => !reserveCards.includes(card));
		}

		// Make sure we have enough cards left - TODO: handle this better/let the user know what's happening
		if (answerDeck.length < numCardsNeeded) console.error("Not enough answer cards left!");

		// Take the cards we need off the top of the deck
		cardsToGive.push(...answerDeck.slice(0, numCardsNeeded));

		// Remove the cards we took from the deck
		answerDeck = answerDeck.filter(card => !cardsToGive.includes(card));

		let userDocPayload = {
			hand: admin.firestore.FieldValue.arrayUnion(...cardsToGive),
			numCardsInHand: admin.firestore.FieldValue.increment(cardsToGive.length)
		}
		if (promoPhotoMode) userDocPayload.hand = cardsToGive;
		if (reserveCards !== null) userDocPayload.reserveCards = reserveCards;

		// Update the user document to reflect the cards being in our hand
		try {
			await userDocRef.update(userDocPayload);
		} catch (error) {
			console.error(error);
		}
	}

	// End Card Replenishment ////////////////////////////////////////////////////////

	// Select a New Question Card ////////////////////////////////////////////////////

	// Set our reference
	let questionDeck = decks.questionDeck;

	// Make sure we have question cards left
	if (questionDeck.length < 1) throw new Error("No question cards left!");

	// Randomly select a new question card
	const newQuestionCard = questionDeck[Math.floor(Math.random() * questionDeck.length)];

	// End Question Card Selection ///////////////////////////////////////////////////

	// Select New Czar ///////////////////////////////////////////////////////////////

	// Note: we jump through the hoop of creating a new array and sorting it by czarOrder
	// rather than just directly accessing the entry with the correct czarOrder to ensure
	// that it works when people leave mid-game.
	let possibleCzars = [];
	// Add username to each entry so we can easily access
	for (user in roomData.users) possibleCzars.push(Object.assign(roomData.users[user], { 'username': user }));
	possibleCzars.sort((a, b) => a.czarOrder - b.czarOrder);
	let newCzar = possibleCzars[roomData.turn.round % possibleCzars.length].username;

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

	db.doc(`games/${roomId}/meta/chat`).update({
    chatMessages: admin.firestore.FieldValue.arrayUnion({
      text: `Round ${roomData.turn.round + 1}: ${newCzar} is the Czar.`,
      type: 'system'
    })
  });
	console.log(`New turn started successfully for room ${roomId}`);

	return true;
}