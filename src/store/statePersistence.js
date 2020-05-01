class statePersistence {
	constructor(options) {
		this.storage = options.storage || localStorage,
		this.key = options.key || 'savedState';

		this.getSavedState = () => {
			// Return null if we don't have a state saved already, like if
			// we're connecting for the first time.
			if(this.storage[this.key] === undefined) return null;

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
				this.storage.setItem(this.key, JSON.stringify(state));
			});
		}
	
		this.RESTORE_STATE_MUTATION = (state, savedState) => {
			if(savedState !== null) {
				for(let properyName of Object.keys(savedState)) {
					state[properyName] = savedState[properyName];
				}
			}
		}
	}
}

export default statePersistence;