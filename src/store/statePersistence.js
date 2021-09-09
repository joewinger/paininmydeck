class statePersistence {
	constructor(options) {
		this.storage = options.storage || localStorage,
		this.key = options.key || 'savedState';
		this.omitKeys = options.omitKeys || [];

		this.getSavedState = () => {
			// Return null if we don't have a state saved already, like if
			// we're connecting for the first time.
			if (this.storage[this.key] === undefined) return null;

			return JSON.parse(this.storage[this.key]);
		}

		this.restoreState = (store) => {
			store.commit('RESTORE_STATE_MUTATION', this.getSavedState());
			
			if(options.onRestoreState !== undefined) options.onRestoreState();
		}

		this.plugin = (store) => {
			// Run this as soon as the plugin initializes. This is how
			// our state automatically resumes when the tab is reloaded.
			this.restoreState(store);
	
			store.subscribe((_mutation, state) => {
				let _state = {...state}; // Make a copy so we're not altering the actual state.
				for (let i = 0; i < this.omitKeys.length; i++) {
					delete _state[this.omitKeys[i]];
				}
				this.storage.setItem(this.key, JSON.stringify(_state));
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

export default statePersistence;