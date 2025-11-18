export interface RegisterRes {
	status: string;
	message: string;
	data: {
		clientId: string;
		csrf: string | undefined;
		username: string;
		email: string;
		name: string;
		role: string;
	};
}
