import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/functions";
import config from './firebaseConfig';
import router from './router';

const db = firebase.initializeApp(config).firestore();
const functions = firebase.functions();

const cloudFuncs = {
	startGame: functions.httpsCallable('startGame'),
	startNewTurn: functions.httpsCallable('startNewTurn')
}

let roomDocRef = null;
let userDocRef = null;

const defaultRoomDocument = {
	timestamp: firebase.firestore.FieldValue.serverTimestamp(),
	gameState: "LOBBY", // PLAYING, FINISHED
	players: [], // Used to cycle card czar
	settings: {
		pointsToWin: 10,
		cardsPerHand: 10
	},
	deckBlack: [],
	deckWhite: [],
	currentBlackCard: null,
	currentCzar: null,
	activeCards: [],
	turnStatus: null, // WAITING_FOR_CARDS, WAITING_FOR_CZAR
	turnWinningCard: null,
	winner: null
};
const defaultUserDocument = {
	ready: 1, // odd = not ready, even = ready. This is 3x as fast as using a boolean.
	color: "#000000",
	points: 0,
	hand: [],
	numCardsInHand: 0
};

/*
 * Joining & Creating Rooms
 */

function joinRoom(roomId) {
	return new Promise((resolve, reject) => {
		console.group("dbManager.joinRoom");
		console.debug(`Attempting to join room ${roomId}...`);
		
		roomDocRef = db.collection("games").doc(String(roomId));

		roomDocRef.get().then(function(roomDocSnapshot) {
			if (roomDocSnapshot.exists) {
				dbManager.roomData.gameState = "LOBBY"; // Set this now, so if we join a game that's already started it'll forward us to the game view. Used for testing.

				console.debug("Success! Room document retrieved.", roomDocSnapshot.data());
				dbManager.roomData.roomId = roomDocSnapshot.id;
				
				// Start watching this room
				roomDocRef.onSnapshot((snap) => updateRoomData(snap));
				// Start watching the users collection (To display other users -- using a collection makes it easier to monitor ready-ness of players)
				roomDocRef.collection('users').onSnapshot((snap) => updateUsersData(snap));

				console.debug(`roomData.currentRoomId = ${dbManager.roomData.roomId}`);

				resolve();
			} else {
				roomDocRef = null;
				console.debug(`Room ${roomId} doesn't exist :(`);
				reject(`Room ${roomId} doesn't exist :(`);
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
				dbManager.currentRoom = newRoomId;
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

/*
 * Lobby Functionality
 */

// https://firebase.google.com/docs/firestore/manage-data/add-data?authuser=0#update_elements_in_an_array
async function addUser(username) { // To be used after already joining the game
	username = String(username);

	const roomDocData = await roomDocRef.get().then(snap => { return snap.data() });
	const allUsers = roomDocData.players;
	
	dbManager.userData.isPrivileged = (allUsers.length == 0);
	
	userDocRef = roomDocRef.collection('users').doc(username); // Create our user doc & save it for easy access
	userDocRef.set(defaultUserDocument);

	roomDocRef.update({
		players: firebase.firestore.FieldValue.arrayUnion(username) // Add to list so we can become card czar at some point
	});

	dbManager.userData.username = username; // Save so that we remember who we are
}

function toggleReady() {
	userDocRef.update({
		ready: firebase.firestore.FieldValue.increment(1)
	}).catch(err => {
		console.error(err);
	});
}

async function startGame() {
	await cloudFuncs.startGame({roomId:dbManager.roomData.roomId});
}


async function startNewTurn() {
	await cloudFuncs.startNewTurn({roomId:dbManager.roomData.roomId});
}

/*
 * Data Sync (giving the Vue object access to our data)
 */

function updateRoomData(snapshot) {
	let newRoomData = snapshot.data();
	console.log("New room data!", newRoomData);

	/* Logic */
	if(dbManager.roomData.gameState == "LOBBY" && newRoomData.gameState == "PLAYING") { // Game just started
		console.log("Game has started!");
		router.push('Game');
	}
	if(dbManager.roomData.gameState == "PLAYING" && newRoomData.gameState == "FINISHED") { // Game just finished
		router.push('EndGame');
	}

	if(dbManager.roomData.currentBlackCard != newRoomData.currentBlackCard) { // This is a new turn
		dbManager.userData.playedThisTurn = false;
	}

	if(dbManager.userData.isCzar) {
	if(dbManager.roomData.activeCards.length < newRoomData.activeCards.length) { // If someone just played a card
		if(newRoomData.activeCards.length == dbManager.roomData.users.length-1) { // Everyone has played cards
				roomDocRef.update({
					turnStatus: "WAITING_FOR_CZAR"
				});
			}
		}
	}

	/* Setting values */
	dbManager.roomData.gameState = newRoomData.gameState;
	dbManager.roomData.currentBlackCard = newRoomData.currentBlackCard;
	dbManager.roomData.currentCzar = newRoomData.currentCzar;
	dbManager.roomData.activeCards = newRoomData.activeCards;
	dbManager.roomData.turnStatus = newRoomData.turnStatus;
	dbManager.roomData.pointsToWin = newRoomData.settings.pointsToWin;
	dbManager.roomData.turnWinningCard = newRoomData.turnWinningCard;
	dbManager.roomData.winner = newRoomData.winner;
	dbManager.userData.isCzar = (newRoomData.currentCzar == dbManager.userData.username);
}

function updateUsersData(snapshot) { // TODO: This still gets called after we detach the snapshot listener :/
	console.debug("New users data!");
	
	let users = [];
	snapshot.forEach(userDoc => {
		users.push({
			'username': userDoc.id,
			'ready': ((userDoc.get('ready') % 2) == 0), // true if even
			'color': userDoc.get('color'),
			'points': userDoc.get('points')
		});

		if(userDoc.id == dbManager.userData.username) { // This is us
			dbManager.userData.isReady = (userDoc.get('ready') % 2) == 0;
			dbManager.userData.hand = userDoc.get('hand');
			dbManager.userData.points = userDoc.get('points');
		}
	});

	dbManager.roomData.users = users;
}

/*
 * Gameplay mechanics
 */

async function playCard(cardText) {
	if(dbManager.userData.isCzar) return; // Just in case this somehow gets called

	console.log(cardText);

	const newHand = dbManager.userData.hand.filter(c => c != cardText); // Remove the card we just played from our hand

	userDocRef.update({
		hand: newHand, // Remove this card from the array
		numCardsInHand: newHand.length
	});
	
	roomDocRef.update({
		activeCards: firebase.firestore.FieldValue.arrayUnion({text: cardText, playedBy: dbManager.userData.username})
	});

}

async function chooseCard(cardText) {
	if(!dbManager.userData.isCzar) return;

	const playedBy = dbManager.roomData.activeCards.find(c => c.text == cardText).playedBy;

	await roomDocRef.update({
		turnWinningCard: {text:cardText, playedBy: playedBy}
	});

	console.log(cardText + ": " + playedBy);

	await roomDocRef.collection('users').doc(playedBy).update({
		points: firebase.firestore.FieldValue.increment(1)
	});

	const winner = dbManager.roomData.users.find(user => user.points >= dbManager.roomData.pointsToWin) || null;
	
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
	roomData: {
		roomId: null,
		gameState: null,
		users: [],
		currentBlackCard: null,
		currentCzar: null,
		activeCards: [],
		pointsToWin: null,
		turnWinningCard: null,
		winner: null
	},
	userData: {
		isReady: false,
		username: "",
		hand: {},
		isCzar: false,
		isPrivileged: false,
		playedThisTurn: false,
		points: null
	},
	joinRoom: joinRoom, // Rooms
	createRoom: createRoom,
	addUser: addUser, // Lobby func
	toggleReady: toggleReady,
	startGame: startGame,
	playCard: playCard, // Gameplay
	chooseCard: chooseCard
}

export default dbManager;