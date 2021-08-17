import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/functions";
import store from "@/store";

const DEFAULT_USER_DOCUMENT = {
	hand: [],
	numCardsInHand: 0
}

class GameManager {
	// Initialize Firebase right away; this'll be one of the first things run any time
	// the page is loaded.	
	constructor() {
		this.initializeFirebase();
	}

	// Attach ourselves to the global Vue object, so we can call e.g. $game.createRoom() from components
	install(Vue) {
		Vue.prototype.$game = this;
	}

	/**
	 * Initialize our db object (either with local config in development or 
	 * the magic url Firebase provides in production), save our cloud function
	 * references 
	 */
	async initializeFirebase() {
		console.debug("Initializing Firebase...");
		
		let fbconfig;
		if(process.env.NODE_ENV === 'production') {
			console.debug("Production mode - using namespaced init config");
			fbconfig = await fetch('/__/firebase/init.json').then(response => { return response.json(); });
		} else {
			fbconfig = require('../firebase-config.json');
		}
		this.db = firebase.initializeApp(fbconfig).firestore();
		
		/*
		 * The following lines are for state management. If our state indicates
		 * that we should be in a room, this will set the proper references,
		 * listeners, and unsubscribe callbacks. If not, just set these to null.
		 */
		this.roomDocRef = (store.state.room.roomId === null) ? null : this.db.doc(`games/${store.state.room.roomId}`);
		this.chatDocRef = (store.state.room.roomId === null) ? null : this.db.doc(`games/${store.state.room.roomId}/meta/chat`);
		this.userDocRef = (store.state.user.username === '') ? null : this.db.doc(`games/${store.state.room.roomId}/users/${store.state.user.username}`);
		this.unsubFromRoomDoc = 	(this.roomDocRef === null) ? null : this.roomDocRef.onSnapshot(snap => this.onRoomUpdate(snap));
		this.unsubFromChatDoc = 	(this.chatDocRef === null) ? null : this.chatDocRef.onSnapshot(snap => this.onChatUpdate(snap));
		this.unsubFromUserDoc = 	(this.userDocRef === null) ? null : this.userDocRef.onSnapshot(snap => this.onUserUpdate(snap));
	
		// Analytics
		if(process.env.NODE_ENV === 'production') firebase.analytics();
	
		console.debug("Firebase Initialized OK");
	}

	/**
	 * Joins a room. Leaves our current room if state.room.roomId != null, Sets our listeners &
	 * unsubscribes, and authenticates us.
	 * @param {number} roomId - The room we're trying to join
	 * @returns if already connected to room
	 * @throws {Error} if there's an issue when getting the room document, the error is thrown
	 * @throws {'ROOM_DOES_NOT_EXIST'} if no corresponding room document with that ID exists
	 */
	async joinRoom(roomId) {
		console.debug(`Joining room ${roomId}...`);
	
		if(store.state.room.roomId === roomId) { // If we're already in this room -- i.e. if we reload our tab while in lobby
			console.debug(`Already connected to room ${roomId} 👍`);
			return;
		}
	
		if(store.state.room.roomId !== null) await this.leaveRoom();
		
		this.roomDocRef = this.db.doc(`games/${roomId}`);
		const roomDocSnapshot = await this.roomDocRef.get().catch((err) => {
			console.debug("Error getting room document: ", err);
			throw err;
		});
		
		if (!roomDocSnapshot.exists) {
			console.debug(`Room ${roomId} doesn't exist :(`);
			this.roomDocRef = null;
			throw 'ROOM_DOES_NOT_EXIST';
		}
		
		console.debug("Success! Room document retrieved.", roomDocSnapshot.data());
		// Grant us privileges if we're the first player
		if(Object.keys(roomDocSnapshot.data().users).length === 0) store.commit('user/setPrivileged');
		// Save this roomId so we know we should be connected here
		store.commit('room/setRoomId', roomDocSnapshot.id);
		// Save our chat document for reference later
		this.chatDocRef = this.db.doc(`games/${roomId}/meta/chat`);
		// Start watching the documents & save the returned unsubscribe functions for later.
		this.unsubFromRoomDoc = this.roomDocRef.onSnapshot(snap => this.onRoomUpdate(snap));
		this.unsubFromChatDoc = this.chatDocRef.onSnapshot(snap => this.onChatUpdate(snap));
	
		// Authenticate us while we join.
		// Don't use await here, as this can finish in the background.
		console.debug("Authenticating anonymously...");
		firebase.auth().signInAnonymously()
		.then(() => {
			console.debug("Auth successful :)");
		}).catch((e) => {
			console.error("Auth unsuccessful :( More info below:", `${e.code}: ${e.message}`);
		});
		
		console.groupEnd();
		return;
	}

	/**
	 * Calls our firebase serverless function to create a new room & returns the ID.
	 * 
	 * @returns {number} ID of newly created room
	 * @throws {'ROOM_CREATION_ERROR'} if the response from the cloud function is falsy.
	 */
	async createRoom() {
		let roomId = await firebase.functions().httpsCallable('createRoom')().then(roomId => roomId.data);
		if(!roomId) {
			console.error('Room creation failed :( Check server logs for more info');
			throw 'ROOM_CREATION_ERROR'
		}
		return roomId;
	}

	/**
	 * Unsubscribes from our document listeners (room, chat, & user), deletes our user document,
	 * removes us from the list of players, resets our local database references, and tells our
	 * state to reset itself.
	 */
	leaveRoom() {
		// TODO: Handle us leaving mid-game - Re-assign the czar if it's us, maybe add our cards back in the pile
		console.debug(`Leaving room ${store.state.room.roomId}...`);
		

		if(this.unsubFromRoomDoc != null) this.unsubFromRoomDoc();
		if(this.unsubFromChatDoc != null) this.unsubFromChatDoc();
		if(this.unsubFromUserDoc != null) this.unsubFromUserDoc();
			
		// Get rid of our individual document
		if(this.userDocRef !== null) this.userDocRef.delete()
		.catch(e => console.error(`${e.code}: ${e.message}`));
	
		// Remove us from the list of players
		if(this.roomDocRef !== null && store.state.user.username) this.roomDocRef.update(`users.${store.state.user.username}`, firebase.firestore.FieldValue.delete())
		.catch(e => console.error(`${e.code}: ${e.message}`));
		if(!store.state.user.username) console.error(`Username is blank, could not remove from users list`);
	
		// Reset our references
		this.roomDocRef = null;
		this.userDocRef = null;
	
		// Reset our state
		store.commit('user/reset');
		store.commit('room/reset');
	
		console.debug(`Room left.`)
	}

	/**
	 * Creates our user document, adds us to the room's user list, and saves our username to state.
	 * @param {String} username
	 * @param {String} colorSet - colorSet as a string (e.g. '#FFFFFF,#000000')
	 */
	addUser(username, colorSet) { // To be used after already joining the game
		this.userDocRef = this.db.doc(`games/${store.state.room.roomId}/users/${username}`); // Create our user doc & save it for easy access
		this.userDocRef.set(DEFAULT_USER_DOCUMENT).then(() => { // Put this inside a then to prevent a harmless error if onUserUpdate is called before the user doc is initialized
			this.unsubFromUserDoc = this.userDocRef.onSnapshot(snap => this.onUserUpdate(snap));
		});
		
		this.roomDocRef.update(
			`users.${username}.colorSet`, colorSet.split(','),
			`users.${username}.points`, 0,
			`users.${username}.czarOrder`, store.state.room.users.length
		);
	
		store.commit('user/setUsername', username); // Save so that we remember who we are
	}

	/**
	 * Calls our firebase cloud function startGame
	 */
	async startGame() {
		await firebase.functions().httpsCallable('startGame')({roomId: store.state.room.roomId});
	}

	/**
	 * Calls our firebase cloud function startNewTurn
	 */
	async startNewTurn() {
		await firebase.functions().httpsCallable('startNewTurn')({roomId: store.state.room.roomId});
	}

	/**
	 * Listener for room document changes
	 * @param {firebase.firestore.DocumentSnapshot} snapshot 
	 * @todo Only update state for values that have changed
	 */
	onRoomUpdate(snapshot) {
		let newRoomData = snapshot.data();
		console.log("Room update recieved");
	
		/* Logic */
		// If the game just started
		if(store.state.room.gameState === "LOBBY" && newRoomData.gameState === "PLAYING") {
			console.log("Game has started!");
			store.dispatch('showInterstitial', {title: 'Round 1', subtitle: 'Good luck'});
		}

		// If a new turn has begun
		if(newRoomData.gameState === "PLAYING" && store.state.room.turn.questionCard !== newRoomData.turn.questionCard) {
			store.commit('room/updateRound', newRoomData.turn.round);
			store.commit('user/setPlayedThisTurn', false);
			store.dispatch('showInterstitial');
		}
		
		/** @todo stop relying on czar for game updates like this */
		if(store.getters['user/isCzar']) {
			// If a new card has been played
			if(store.state.room.turn.playedCards.length < newRoomData.turn.playedCards.length) {
				// If all cards have been played
				if(newRoomData.turn.playedCards.length === store.state.room.users.length-1) {
					this.roomDocRef.update({
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
	
	/**
	 * Listener for chat document changes
	 * @param {firebase.firestore.DocumentSnapshot} snapshot
	 */
	onChatUpdate(snapshot) {
		console.debug("Chat update recieved");
		
		store.commit('room/updateChatMessages', snapshot.data().chatMessages);
	}
	
	/**
	 * Listener for user document changes
	 * @param {firebase.firestore.DocumentSnapshot} snapshot 
	 */
	onUserUpdate(snapshot) {
		console.debug("User update recived");
		
		store.commit('user/updateHand', snapshot.data().hand);
	}

	/**
	 * Plays a card - Removes the card from our hand (in local state & in
	 * the db) & updates the room doc to reflect our played card
	 * @param {String} cardText - The text on the card
	 */
	playCard(cardText) { // TODO: Move this to be a vuex action?
		if(store.getters['user/isCzar']) return; // Just in case this somehow gets called

		// Remove the card we just played from our hand
		const newHand = store.state.user.hand.filter(c => c != cardText);

		// And update our user document to reflect the change
		this.userDocRef.update({
			hand: newHand,
			numCardsInHand: newHand.length
		});
		
		// Update the room document to add our card in to play
		this.roomDocRef.update({
			'turn.playedCards': firebase.firestore.FieldValue.arrayUnion({ text: cardText, playedBy: store.state.user.username })
		});

		store.commit('user/setPlayedThisTurn', true);
	}

	/**
	 * Selects the winning card. Updates the room's turn object with the winner &
	 * grants them their points. Checks if someone's reached the point limit, in which
	 * case a game winner is declared.
	 * @param {string} cardText - The text on the card
	 */
	async chooseCard(cardText) {
		// Kick anyone who's not a czar out of this function (just in case)
		if(!store.getters['user/isCzar']) return;

		// Figure out who played the card we selected
		const playedBy = store.state.room.turn.playedCards.find(c => c.text == cardText).playedBy;

		// Update the room document:
		//		1) Let everyone know which card was chosen
		//		2) Grant the winner their points
		await this.roomDocRef.update('turn.winningCard', { text: cardText, playedBy: playedBy },
														`users.${playedBy}.points`, firebase.firestore.FieldValue.increment(1));

		// Figure out if somebody has reached the threshold to win the game
		const winner = store.state.room.users.find(user => user.points >= store.state.room.settings.pointsToWin) || null;
		if(winner) {
			this.endGame(winner);
			return;
		}

		// Wait 3 seconds then start the next turn. This will eventually be replaced with something cooler, like an animation.
		setTimeout(async () => {
			await this.startNewTurn();
		}, 3000);
	}

	/**
	 * Yeet, game over. Updates the room document to reflect winner & update gameState.
	 * @param {string} winner - Username of the winner
	 */
	async endGame(winner) {
		console.log(`${winner} wins!`);

		await this.roomDocRef.update({
			winner: winner,
			gameState: `FINISHED`
		});
	}
}

export default new GameManager();