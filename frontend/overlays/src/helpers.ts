export function generateSocketUrlWithParams(
	path: string,
	params: Record<string, string | undefined>,
): string {
	const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
	const url = new URL(`${protocol}://${location.host}/socket${path}`);

	for (const [key, value] of Object.entries(params)) {
		if (!value) continue;
		url.searchParams.append(key, value);
	}

	return url.toString();
}

export function base64DecodeUnicode(str: string): string {
	return decodeURIComponent(
		atob(str)
			.split('')
			.map(function (c) {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join(''),
	);
}

export function getTimeDiffInMilliseconds(minutes: number): number {
	const startDate = new Date();
	const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
	const diff = endDate.getTime() - startDate.getTime();

	return diff;
}

export function pad2Num(num: number): string {
	return num.toString().padStart(2, '0');
}

export function millisecondsToTime(ms: number): string {
	const milliseconds = ms % 1000;
	ms = (ms - milliseconds) / 1000;
	const seconds = ms % 60;
	ms = (ms - seconds) / 60;
	const minutes = ms % 60;
	const hours = (ms - minutes) / 60;

	return `${hours ? pad2Num(hours) + ':' : ''}${pad2Num(minutes)}:${pad2Num(seconds)}`;
}
