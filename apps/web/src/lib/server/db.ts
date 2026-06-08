export function isMissingTableError(error: unknown) {
	let current: unknown = error;

	while (current instanceof Error) {
		if (current.message.includes('no such table')) {
			return true;
		}

		current = current.cause;
	}

	return false;
}
