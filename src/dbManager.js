import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/functions";
import router from './router';
import store from "./store";

let config;

if(process.env.NODE_ENV === 'production') {
	fetch('/__/firebase/init.json').then(response => {
		config = response.json();
	});
} else {
	config = require('./firebaseConfig').default;
}

const db = firebase.initializeApp(config).firestore();
const functions = firebase.functions();

const cloudFuncs = {
	startGame: functions.httpsCallable('startGame'),
	startNewTurn: functions.httpsCallable('startNewTurn')
}


/*
 * The following lines are for state management. If our state is configured in such a
 * way that indicates we should be in a room, this will set the proper references,
 * listeners, and unsubscribe callbacks. If not, just set these to null.
 */
let roomDocRef = (store.state.room.roomId === null) ? null : db.collection("games").doc(String(store.state.room.roomId));
let userDocRef = (store.state.user.username === '') ? null : roomDocRef.collection('users').doc(store.state.user.username);
let unsubFromRoomDoc =        (roomDocRef === null) ? null : roomDocRef.onSnapshot((snap) => updateRoomData(snap));
let unsubFromUserCollection = (userDocRef === null) ? null : roomDocRef.collection('users').onSnapshot((snap) => updateUsersData(snap))

const defaultRoomDocument = {
	timestamp: firebase.firestore.FieldValue.serverTimestamp(),
	gameState: "LOBBY", // PLAYING, FINISHED
	players: [], // Used to cycle card czar
	settings: {
		pointsToWin: 10,
		cardsPerHand: 7
	},
	chatMessages: [],
	// [{
	//   timestamp: Number (Unix timestamp in millis via dayjs().valueOf())
	//   sender: String
	//   text: String
	// }, ...]
	deckBlack: [],
	deckWhite: [],
	currentBlackCard: null,
	currentCzar: null,
	activeCards: [],
	turnStatus: null, // WAITING_FOR_CARDS, WAITING_FOR_CZAR
	turnWinningCard: null,
	winner: null
};

// From colours.cafe:
// "#f36747", "#f197a2", "#4360a8", "#3cc6ed", "#842d73", "#ee316b", "#4152a5", "#ffb137", "#3cc6ed", "#5ce5aa"
const allColorSets = [
	"#A18CD1,#FBC2EB",
	"#A6A1EE,#FBC2EB",
	"#F6D365,#FDA085",
	"#A1C4FD,#C2E9FB",
	"#FEE140,#FA709A",
	"#C471F5,#FA71CD"
];

function generateUserDocument() {
	const availableColorSets = allColorSets.filter(colorSet => !store.getters['room/getUsedColorSets'].includes(colorSet))
	let colorSet = null;
	if(store.state.room.users.length >= allColorSets.length) {
		colorSet = allColorSets[Math.floor(Math.random() * allColorSets.length)]
	} else {
		colorSet = availableColorSets[Math.floor(Math.random() * availableColorSets.length)]
	}
	return {
		ready: 1, // odd = not ready, even = ready. This is 3x as fast as using a boolean.
		colorSet: colorSet,
		points: 0,
		hand: [],
		numCardsInHand: 0
	}
}

/*
 * Joining, Creating, & Leaving Rooms
 */

function joinRoom(roomId) {
	return new Promise((resolve, reject) => {
		console.group("dbManager.joinRoom");
		console.debug(`Attempting to join room ${roomId}...`);
		
		roomDocRef = db.collection("games").doc(String(roomId));

		roomDocRef.get().then(function(roomDocSnapshot) {
			if (roomDocSnapshot.exists) {
				store.commit('room/updateGameState', 'LOBBY');// Set this now, so if we join a game that's already started it'll forward us to the game view. Used for testing.
				
				if(roomDocSnapshot.data().players.length == 0) store.commit('user/setPrivileged');

				console.debug("Success! Room document retrieved.", roomDocSnapshot.data());
				store.commit('room/setRoomId', roomDocSnapshot.id);
				
				// Start watching this room
				unsubFromRoomDoc = roomDocRef.onSnapshot((snap) => updateRoomData(snap));
				// Start watching the users collection (To display other users -- using a collection makes it easier to monitor ready-ness of players)
				unsubFromUserCollection = roomDocRef.collection('users').onSnapshot((snap) => updateUsersData(snap));

				resolve();
			} else {
				roomDocRef = null;
				console.debug(`Room ${roomId} doesn't exist :(`);
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

function createRoom() {
	return new Promise((resolve, reject) => {
		console.group('dbManager.createRoom');
		console.debug('Creating a new room...')
		
		generateRoomId().then((newRoomId) => {
			db.collection("games").doc("" + newRoomId).set(defaultRoomDocument)
			.then(() => {
				console.debug(`Room ${newRoomId} created successfully!`);
				console.groupEnd();
				
				resolve(newRoomId);
			})
			.catch((err) => {
				console.error("Room could not be created :( ", err);
				console.groupEnd();
				
				reject(err);
			});
		});
	});
}

function fetchAllRooms() {
	return new Promise((resolve, reject) => {
		console.groupCollapsed('fetchAllRooms()');
		console.debug('Fetching rooms...');
		
		let rooms = [];
		db.collection('games').get().then((querySnapshot) => {
			querySnapshot.forEach((room) => {
				rooms.push(room.id);
			});
		}).then(() => {
			console.debug(`${rooms.length} rooms found!`);
			console.groupEnd();
			
			resolve(rooms);
		}).catch((err) => {
			reject(err);
		});
		
	});
}

function generateRoomId() {
	return new Promise((resolve) => {
		console.group('generateRoomId()');
		console.debug('Generating new roomId...');
				
		let min = Math.ceil(1000);
		let max = Math.floor(9999);
		let roomId = Math.floor(Math.random() * (max - min + 1)) + min;
		
		console.debug('Verifying availability...')

		fetchAllRooms().then((allRooms) => {
			while(allRooms.includes(roomId)) {
				console.debug(`Oops! Someone's already using ${roomId}. Regenerating...`);
				roomId = Math.floor(Math.random() * (max - min + 1)) + min;
			}
			
			console.debug(`Success! RoomId ${roomId} is available :)`);
			console.groupEnd();
			
			resolve(roomId);
		});
	});
}

function leaveRoom() {
	// TODO: Handle us leaving mid-game - Re-assign the czar if it's us, maybe add our cards back in the pile

	unsubFromRoomDoc();
	unsubFromUserCollection();
	
	if(userDocRef !== null) userDocRef.delete().catch(e => console.error(e));

	if(roomDocRef !== null) roomDocRef.update({
		players: firebase.firestore.FieldValue.arrayRemove(store.state.user.username) // Add to list so we can become card czar at some point
	});
	
	roomDocRef = null;
	userDocRef = null;

	store.commit('user/reset');
	store.commit('room/reset');
}

/*
 * Lobby Functionality
 */

// https://firebase.google.com/docs/firestore/manage-data/add-data?authuser=0#update_elements_in_an_array
async function addUser(username) { // To be used after already joining the game
	username = String(username);
	
	userDocRef = roomDocRef.collection('users').doc(username); // Create our user doc & save it for easy access
	userDocRef.set(generateUserDocument());

	roomDocRef.update({
		players: firebase.firestore.FieldValue.arrayUnion(username) // Add to list so we can become card czar at some point
	});

	store.commit('user/setUsername', username); // Save so that we remember who we are
}

function toggleReady() {
	userDocRef.update({
		ready: firebase.firestore.FieldValue.increment(1)
	}).catch(err => {
		console.error(err);
	});
}

async function startGame() {
	await cloudFuncs.startGame({roomId: store.state.room.roomId});
}

async function startNewTurn() {
	await cloudFuncs.startNewTurn({roomId: store.state.room.roomId});
}

/*
 * Data Sync (giving the Vue object access to our data)
 */

function updateRoomData(snapshot) { // TODO tidy this up - I don't like updating the entire state every time this is run
	let newRoomData = snapshot.data();
	console.log("New room data!", newRoomData);

	/* Logic */
	if(store.state.room.gameState == "LOBBY" && newRoomData.gameState == "PLAYING") { // Game just started
		console.log("Game has started!");
		router.replace({name: 'game'});
	}
	if(store.state.room.gameState == "PLAYING" && newRoomData.gameState == "FINISHED") { // Game just finished
		router.replace({name: 'endgame'});
	}

	if(store.state.room.currentBlackCard != newRoomData.currentBlackCard) { // This is a new turn
		store.commit('user/setPlayedThisTurn', false);
	}

	if(store.getters['user/isCzar']) {
		if(store.state.room.activeCards.length < newRoomData.activeCards.length) { // If someone just played a card
			if(newRoomData.activeCards.length == store.state.room.users.length-1) { // Everyone has played cards
				roomDocRef.update({
					turnStatus: "WAITING_FOR_CZAR"
				});
			}
		}
	}

	/* Setting state */
	// If we don't use this if, we're alerted of a new chat message any time updateRoomData() is called
	if(newRoomData.chatMessages.length > store.state.room.chatMessages.length) store.commit('room/updateChatMessages', newRoomData.chatMessages);
	store.commit('room/updateSettings', newRoomData.settings);
	store.commit('room/updateGameState', newRoomData.gameState);
	store.commit('room/updateBlackCard', newRoomData.currentBlackCard);
	store.commit('room/updateCzar', newRoomData.currentCzar);
	store.commit('room/updateActiveCards', newRoomData.activeCards);
	store.commit('room/updateTurnStatus', newRoomData.turnStatus);
	store.commit('room/setPointsToWin', newRoomData.settings.pointsToWin);
	store.commit('room/updateTurnWinningCard', newRoomData.turnWinningCard);
	store.commit('room/setGameWinner', newRoomData.winner);
}

function updateUsersData(snapshot) { // TODO: This still gets called after we detach the snapshot listener :/
	console.debug("New users data!");
	
	let users = [];
	snapshot.forEach(userDoc => {
		users.push({
			'username': userDoc.id,
			'ready': ((userDoc.get('ready') % 2) == 0), // true if even
			'colorSet': userDoc.get('colorSet').split(','),
			'points': userDoc.get('points')
		});

		if(userDoc.id == store.state.user.username) { // This is us
			store.commit('user/updateReadyStatus', userDoc.get('ready'));
			store.commit('user/updateHand', userDoc.get('hand'));
			store.commit('user/updatePoints', userDoc.get('points'));
		}
	});

	store.commit('room/updateUsers', users);
}

/*
 * Gameplay mechanics
 */

async function playCard(cardText) { // TODO: Move this to be a vuex action?
	if(store.getters['user/isCzar']) return; // Just in case this somehow gets called

	console.log(cardText);

	const newHand = store.state.user.hand.filter(c => c != cardText); // Remove the card we just played from our hand

	userDocRef.update({
		hand: newHand, // Remove this card from the array
		numCardsInHand: newHand.length
	});
	
	roomDocRef.update({
		activeCards: firebase.firestore.FieldValue.arrayUnion({text: cardText, playedBy: store.state.user.username})
	});

}

async function chooseCard(cardText) {
	if(!store.getters['user/isCzar']) return; // Just in case

	const playedBy = store.state.room.activeCards.find(c => c.text == cardText).playedBy;

	await roomDocRef.update({
		turnWinningCard: {text:cardText, playedBy: playedBy}
	});

	await roomDocRef.collection('users').doc(playedBy).update({
		points: firebase.firestore.FieldValue.increment(1)
	});

	const winner = store.state.room.users.find(user => user.points >= store.state.room.pointsToWin) || null;
	
	if(winner != null) {
		endGame(winner);
		return;
	}

	setTimeout(async () => {
		await startNewTurn();
	}, 3000);
}

async function endGame(winner) {
	console.log(`${winner} wins!`);

	await roomDocRef.update({
		winner: winner,
		gameState: "FINISHED"
	});
}

const dbManager = {
	joinRoom, // Rooms
	createRoom,
	leaveRoom,
	addUser, // Lobby func
	toggleReady,
	startGame,
	playCard, // Gameplay
	chooseCard
}

export default dbManager;