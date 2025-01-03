class Command {
	constructor(client, options) {
		this.client = client;
		this.name = options.name;
		this.description = options.description;
		this.options = options.options;

		this.config = {
			ephemeral: false,
			autoDefer: true,
			requireDatabase: false,
		};
	}
}

export default Command;