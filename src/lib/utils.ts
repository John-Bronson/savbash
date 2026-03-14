export function timeAgo(dateStr: string): string {
	const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

	return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function highlightMentions(body: string, currentUserNames: string[]): string {
	return body.replace(/@(\w[\w\s]*?)(?=\u00A0|\s@|$|\s(?![\w])|\.|,|!|\?)/g, (match, name) => {
		const isCurrentUser = currentUserNames.some((n) => n.toLowerCase() === name.toLowerCase());
		if (isCurrentUser) {
			return `<span class="rounded bg-blue-600/30 px-1 font-medium text-blue-300">${match}</span>`;
		}
		return `<span class="rounded bg-gray-700/50 px-1 font-medium text-gray-300">${match}</span>`;
	});
}
