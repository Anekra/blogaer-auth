export interface DefaultRes {
	status: string;
	message?: string;
	data?: unknown;
}

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
		isVerified: boolean;
	};
}

export interface LoginRes {
	status: string;
	message: string;
	data: {
		clientId: string;
		csrf: string | undefined;
		username: string;
		email: string;
		name: string | undefined;
		desc: string | undefined;
		img: string | undefined;
		exp: number;
		role: string;
		isVerified: boolean;
	};
}
