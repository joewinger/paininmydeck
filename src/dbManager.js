import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/functions";
import store from "@/store";

let config, db, cloudFuncs;
let roomDocRef, userDocRef, chatDocRef,
		unsubFromRoomDoc, unsubFromUserDoc, unsubFromChatDoc;

let firebaseInitialized = false;

async function initializeFirebase() {
	console.debug("Initializing Firebase...");

	if(firebaseInitialized) {
		console.debug("Firebase already initialized!");
		return;
	}

	if(process.env.NODE_ENV === 'production') {
		console.debug("We're in production mode!");
		config = await fetch('/__/firebase/init.json').then(response => { return response.json(); });
	} else {
		config = require('../firebase-config.json');
	}
	db = firebase.initializeApp(config).firestore();

	cloudFuncs = {
		startGame: firebase.functions().httpsCallable('startGame'),
		startNewTurn: firebase.functions().httpsCallable('startNewTurn'),
		createRoom: firebase.functions().httpsCallable('createRoom')
	}
	
	/*
	 * The following lines are for state management. If our state is configured in such a
	 * way that indicates we should be in a room, this will set the proper references,
	 * listeners, and unsubscribe callbacks. If not, just set these to null.
	 */
	roomDocRef = (store.state.room.roomId === null) ? null : db.doc(`games/${store.state.room.roomId}`);
	chatDocRef = (store.state.room.roomId === null) ? null : db.doc(`games/${store.state.room.roomId}/meta/chat`);
	userDocRef = (store.state.user.username === '') ? null : db.doc(`games/${store.state.room.roomId}/users/${store.state.user.username}`);
	unsubFromRoomDoc =        (roomDocRef === null) ? null : roomDocRef.onSnapshot(snap => onRoomUpdate(snap));
	unsubFromChatDoc =        (chatDocRef === null) ? null : chatDocRef.onSnapshot(snap => onChatUpdate(snap));
	unsubFromUserDoc =        (userDocRef === null) ? null : userDocRef.onSnapshot(snap => onUserUpdate(snap));

	// Analytics
	if(process.env.NODE_ENV === 'production') firebase.analytics();

	console.debug("Firebase initialized!");
	firebaseInitialized = true;
}

const allColorSets = [
	// "#F36747,#F3D147",
	// "#F197A2,#fff0a0",
	// "#769cf9,#f392ff",
	// "#3CC6ED,#78ffa7",
	// "#eeaeca,#94bbe9",
	// "#ee58d1,#ffd665",
	// "#ff79a2,#c2c3ff",
	// "#5ce591,#5cd4e5"
	"#A18CD1,#FBC2EB",
	"#A6A1EE,#FBC2EB",
	"#F6D365,#FDA085",
	"#A1C4FD,#C2E9FB",
	"#FEE140,#FA709A",
	"#C471F5,#FA71CD"
];

const DEFAULT_USER_DOCUMENT = {
	hand: [],
	numCardsInHand: 0
}

function generateUserColorSet() {
	const availableColorSets = allColorSets.filter(colorSet => !store.getters['room/getUsedColorSets'].includes(colorSet))
	
	let colorSet = null;
	if(store.state.room.users.length >= allColorSets.length) {
		colorSet = allColorSets[Math.floor(Math.random() * allColorSets.length)]
	} else {
		colorSet = availableColorSets[Math.floor(Math.random() * availableColorSets.length)]
	}

	return colorSet.split(',');
}

/*
 * Joining, Creating, & Leaving Rooms
 */

async function joinRoom(roomId) {
	await initializeFirebase();
	return new Promise((resolve, reject) => {
		console.group("dbManager.joinRoom");
		console.debug(`Attempting to join room ${roomId}...`);
		
		if(store.state.room.roomId === roomId) { // If we're already in this room -- i.e. if we reload our tab while in lobby
			console.debug("Aborting! We're already connected to this room.");
			console.groupEnd();
			reject('ALREADY_IN_THIS_ROOM');
			return;
		}

		if(store.state.room.roomId !== null) leaveRoom();

		roomDocRef = db.doc(`games/${roomId}`);

		roomDocRef.get().then(function(roomDocSnapshot) {
			if (roomDocSnapshot.exists) {
				console.debug("Success! Room document retrieved.", roomDocSnapshot.data());

				if(Object.keys(roomDocSnapshot.data().users).length === 0) store.commit('user/setPrivileged');
				store.commit('room/setRoomId', roomDocSnapshot.id);
				
				chatDocRef = db.doc(`games/${roomId}/meta/chat`);

				// Start watching this room & save the returned unsubscribe function for later.
				unsubFromRoomDoc = roomDocRef.onSnapshot(snap => onRoomUpdate(snap));
				unsubFromChatDoc = chatDocRef.onSnapshot(snap => onChatUpdate(snap));

				resolve();
			} else {
				console.debug(`Room ${roomId} doesn't exist :(`);
				roomDocRef = null;
				reject('ROOM_DOES_NOT_EXIST');
			}
			console.groupEnd();
		}).catch(function(err) {
			console.debug("Error getting document: ", err);
			console.groupEnd();
			reject(err)
		});
	});
}

async function createRoom() {
	await initializeFirebase();

	let roomId = await cloudFuncs.createRoom();
	
	roomId = roomId.data;

	if(roomId === false) console.error('Room creation failed :( Check server logs for more info');

	return roomId;
}

function leaveRoom() {
	// TODO: Handle us leaving mid-game - Re-assign the czar if it's us, maybe add our cards back in the pile

	console.debug(`Leaving room ${store.state.room.roomId}!`);

	initializeFirebase().then(() => {
		if(unsubFromRoomDoc !== null) unsubFromRoomDoc();
		if(unsubFromChatDoc !== null) unsubFromChatDoc();
		if(unsubFromUserDoc !== null) unsubFromUserDoc();
		
		if(userDocRef !== null) userDocRef.delete().catch(e => console.error(e));
	
		if(roomDocRef !== null) roomDocRef.update(`players.${store.state.user.username}`, firebase.firestore.FieldValue.delete());

		roomDocRef = null;
		userDocRef = null;
	});

	store.commit('user/reset');
	store.commit('room/reset');
}

// Lobby Functionality /////////////////////////////////////////////////////////////

// https://firebase.google.com/docs/firestore/manage-data/add-data?authuser=0#update_elements_in_an_array
async function addUser(username) { // To be used after already joining the game
	
	userDocRef = db.doc(`games/${store.state.room.roomId}/users/${username}`); // Create our user doc & save it for easy access
	userDocRef.set(DEFAULT_USER_DOCUMENT).then(() => { // Put this inside a then to prevent a harmless error if onUserUpdate is called before the user doc is initialized
		unsubFromUserDoc = userDocRef.onSnapshot(snap => onUserUpdate(snap));
	});

	roomDocRef.update(`users.${username}.colorSet`, generateUserColorSet(),
										`users.${username}.points`, 0);

	store.commit('user/setUsername', username); // Save so that we remember who we are
}

async function startGame() {
	await cloudFuncs.startGame({roomId: store.state.room.roomId});
}

async function startNewTurn() {
	await cloudFuncs.startNewTurn({roomId: store.state.room.roomId});
}

/*
 * Data Sync (passing our data to Vuex)
 */

function onRoomUpdate(snapshot) { // TODO tidy this up - I don't like updating the entire state every time this is run
	let newRoomData = snapshot.data();
	console.log("New room data!", newRoomData);

	/* Logic */
	if(store.state.room.gameState === "LOBBY" && newRoomData.gameState === "PLAYING") { // Game just started
		console.log("Game has started!");
	}

	if(store.state.room.turn.questionCard !== newRoomData.turn.questionCard) { // This is a new turn
		store.commit('user/setPlayedThisTurn', false);
	}

	if(store.getters['user/isCzar']) {
		if(store.state.room.turn.playedCards.length < newRoomData.turn.playedCards.length) { // If someone just played a card
			if(newRoomData.turn.playedCards.length === store.state.room.users.length-1) { // Everyone has played cards
				roomDocRef.update({
					'turn.status': 'WAITING_FOR_CZAR'
				});
			}
		}
	} 

	/* Setting state */
	store.dispatch('room/updateUsers', newRoomData.users);
	store.commit('room/updateSettings', newRoomData.settings);
	store.dispatch('room/updateGameState', newRoomData.gameState); // This action routes us depending on the supplied gameState
	store.commit('room/updateQuestionCard', newRoomData.turn.questionCard);
	store.commit('room/updateCzar', newRoomData.turn.czar);
	store.commit('room/updatePlayedCards', newRoomData.turn.playedCards);
	store.commit('room/updateTurnStatus', newRoomData.turn.status);
	store.commit('room/updateWinningCard', newRoomData.turn.winningCard);
	store.commit('room/setGameWinner', newRoomData.winner);
}

function onChatUpdate(snapshot) {
	console.debug("New chat data!");
	
	store.commit('room/updateChatMessages', snapshot.data().chatMessages);
}

function onUserUpdate(snapshot) {
	console.debug("New user data!");
	
	store.commit('user/updateHand', snapshot.data().hand);
}


// Gameplay mechanics //////////////////////////////////////////////////////////////

async function playCard(cardText) { // TODO: Move this to be a vuex action?
	if(store.getters['user/isCzar']) return; // Just in case this somehow gets called

	// Remove the card we just played from our hand
	const newHand = store.state.user.hand.filter(c => c != cardText);
	// And update our user document to reflect the change
	userDocRef.update({
		hand: newHand,
		numCardsInHand: newHand.length
	});
	
	// Update the room document to add our card in to play
	roomDocRef.update({
		'turn.playedCards': firebase.firestore.FieldValue.arrayUnion({ text: cardText, playedBy: store.state.user.username })
	});
}

async function chooseCard(cardText) {
	// Kick anyone who's not a czar out of this function (just in case)
	if(!store.getters['user/isCzar']) return;

	// Figure out who played the card we selected
	const playedBy = store.state.room.turn.playedCards.find(c => c.text == cardText).playedBy;

	// Update the room document:
	//		A) Let everyone know which card was chosen
	//		B) Grant the winner their points
	await roomDocRef.update('turn.winningCard', { text: cardText, playedBy: playedBy },
													`users.${playedBy}.points`, firebase.firestore.FieldValue.increment(1));

	// Figure out if somebody has reached the threshold to win the game
	const winner = store.state.room.users.find(user => user.points >= store.state.room.settings.pointsToWin) || null;
	if(winner) {
		endGame(winner);
		return;
	}

	// Wait 3 seconds then start the next turn. This will eventually be replaced with something cooler, like an animation.
	setTimeout(async () => {
		await startNewTurn();
	}, 3000);
}

async function endGame(winner) {
	console.log(`${winner} wins!`);

	await roomDocRef.update({
		winner: winner,
		gameState: `FINISHED`
	});
}

const dbManager = {
	initializeFirebase,
	joinRoom, // Rooms
	createRoom,
	leaveRoom,
	addUser, // Lobby func
	startGame,
	playCard, // Gameplay
	chooseCard
}

export default dbManager;