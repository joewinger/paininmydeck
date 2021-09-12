import md5 from 'md5';

class statePersistence {
	constructor(options) {
		this.storage = options.storage || localStorage,
		this.key = options.key || 'savedState';
		this.hashKey = options.hashKey || 'hash';
		this.omitKeys = options.omitKeys || [];
		this.onVerificationFailed = options.onVerificationFailed || (() => {});

		this.getSavedState = () => {
			const stateStr = this.storage[this.key];
			// Return null if we don't have a state saved already, like if
			// we're connecting for the first time.
			if (stateStr === undefined) return null;

			if (verifyHash(stateStr, this.storage[this.hashKey])) return JSON.parse(stateStr);
			else {
				this.onVerificationFailed();
				return null;
			}
		}

		this.restoreState = (store) => {
			store.commit('RESTORE_STATE_MUTATION', this.getSavedState());
			
			if (options.onRestoreState !== undefined) options.onRestoreState();
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
				this.storage.setItem(this.hashKey, md5(stateStr));
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

function verifyHash(stateStr, hashStr) {
	return md5(stateStr) === hashStr;
}

export default statePersistence;