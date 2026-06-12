export class InvalidNameError extends Error {
	constructor() {
		super("Name must not be empty.");
	}
}
