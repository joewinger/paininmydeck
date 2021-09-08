const startNewTurn = require('./startNewTurn');

exports.handler = async function(data, context, db, admin) {
  let roomId = data.roomId;

	console.log(`Starting game for room ${roomId}`);

	let settings = await (await db.doc(`games/${roomId}`).get()).get('settings');

	await generateGameDecks(db, roomId, settings);
	await startNewTurn.handler(data, context, db, admin);
	
	await db.doc(`games/${roomId}`).update({
		gameState: "PLAYING"
	}).catch(err => console.log(err));
	
	return true;
}

async function generateGameDecks(db, roomId, settings = { numBlankCards: 0, allBlanks: false, familyMode: false }) {
	console.log(`Generating decks for room ${roomId}`);
	
	if (settings === null) {
		console.log(`No settings. Using all cards for room ${roomId}`);
	}

	let questionDeck = [];
	let answerDeck = [];
	
	// Make the text '%BLANK% #' to make them each unique,
	// because firestore.FieldValue.arrayUnion() removes dups
	let numBlanks = settings.allBlanks ? 500 : settings.numBlankCards
	for (let i = 0; i < numBlanks; i++) answerDeck.push(`%BLANK% ${i+1}`);

	let cardCollection = db.collection('cards');

	if (settings.familyMode) {
		cardCollection = cardCollection.where('flags.obscene', '==', false)
		.where('flags.offensive', '==', false)
		.where('flags.sex', '==', false);
	}

	await cardCollection.get().then(querySnapshot => {
		querySnapshot.forEach(cardDocSnapshot => {
			let cardType = cardDocSnapshot.data().cardType;
			console.log(`${cardDocSnapshot.id}: ${cardDocSnapshot.data().text}`);

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