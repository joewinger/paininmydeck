import md5 from 'md5';

class statePersistence {
	constructor(options) {
		this.storage = options.storage || localStorage,
		this.key = options.key || 'savedState';
		this.hashKey = options.hashKey || 'hash';
		this.omitKeys = options.omitKeys || [];
		this.onRestoreState = options.onRestoreState || (() => {});
		this.onVerificationFailed = options.onVerificationFailed || (() => {});

		this.getSavedState = () => {
			const stateStr = this.storage[this.key];
			// Return null if we don't have a state saved already, like if
			// we're connecting for the first time.
			if (stateStr === undefined) return null;

			if (hash(stateStr) === this.storage[this.hashKey]) return JSON.parse(stateStr);
			else {
				this.onVerificationFailed();
				return null;
			}
		}

		this.restoreState = (store) => {
			store.commit('RESTORE_STATE_MUTATION', this.getSavedState());
			
			this.onRestoreState();
		}

		this.plugin = (store) => {
			// Run this as soon as the plugin initializes. This is how
			// our state automatically resumes when the tab is reloaded.
			this.restoreState(store);
	
			store.subscribe((_mutation, _state) => {
				let state = {..._state}; // Make a copy so we're not altering the actual state.
				for (let i = 0; i < this.omitKeys.length; i++) {
					delete state[this.omitKeys[i]];
				}

				const stateStr = JSON.stringify(state);
				this.storage.setItem(this.key, stateStr);
				this.storage.setItem(this.hashKey, hash(stateStr));
			});
		}
	
		this.RESTORE_STATE_MUTATION = (state, savedState) => {
			if (savedState !== null) {
				for (let properyName of Object.keys(savedState)) {
					state[properyName] = savedState[properyName];
				}
			}
		}
	}
}

/**
 * Hash and obfuscate our state. Is this tamper-proof? No. Is this enough of
 * of a pain in the ass to prevent randos from breaking things? Yes.
 * 
 * @param {String} stateStr - String version of the state object to be hashed
 * @returns hashed & obfuscated version of provided string.
 */
function hash(stateStr) {
	const a = md5(stateStr).split('');
	const b = md5(stateStr.split('').reverse().join('')).split('');

	let hash = '';

	for (let i = 0; i < a.length; i++) {
		hash += a[i] + b[i];
	}

	return hash;
}

export default statePersistence;