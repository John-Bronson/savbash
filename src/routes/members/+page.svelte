<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data } = $props();

	let search = $state('');

	const pendingMembers = $derived(
		data.members.filter(
			(m) =>
				m.role === 'pending' &&
				(m.christian_name?.toLowerCase().includes(search.toLowerCase()) ||
					m.bash_name?.toLowerCase().includes(search.toLowerCase()))
		)
	);

	const activeMembers = $derived(
		data.members.filter(
			(m) =>
				m.role !== 'pending' &&
				(m.christian_name?.toLowerCase().includes(search.toLowerCase()) ||
					m.bash_name?.toLowerCase().includes(search.toLowerCase()) ||
					m.email?.toLowerCase().includes(search.toLowerCase()))
		)
	);

	const roleBadgeClasses: Record<string, string> = {
		admin: 'bg-purple-900 text-purple-300',
		moderator: 'bg-blue-900 text-blue-300',
		user: 'bg-gray-800 text-gray-400',
		pending: 'bg-yellow-900 text-yellow-300'
	};

	function displayName(member: { christian_name: string; bash_name: string | null }) {
		return member.bash_name || member.christian_name;
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold text-gray-100">Members ({data.members.length})</h1>
</div>

<input
	type="text"
	placeholder="Search members..."
	bind:value={search}
	class="mb-6 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
/>

{#if pendingMembers.length > 0}
	<div class="mb-8 rounded-lg border border-yellow-800 bg-yellow-900/30 p-4">
		<h2 class="mb-3 font-semibold text-yellow-300">
			Pending Approval ({pendingMembers.length})
		</h2>
		<ul class="space-y-3">
			{#each pendingMembers as member}
				<li class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Avatar profile={member} size="sm" />
						<div>
							<span class="font-medium text-gray-100">{member.christian_name}</span>
							{#if member.email}
								<span class="ml-2 text-sm text-gray-500">{member.email}</span>
							{/if}
						</div>
					</div>
					<form method="POST" action="?/approve" use:enhance>
						<input type="hidden" name="user_id" value={member.id} />
						<button
							type="submit"
							class="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
						>
							Approve
						</button>
					</form>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<div class="space-y-2">
	{#each activeMembers as member}
		<div
			class="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-4 py-3"
		>
			<div class="flex items-center gap-3">
				<Avatar profile={member} size="sm" />
				<div>
					<span class="font-medium text-gray-100">{displayName(member)}</span>
					{#if member.bash_name && member.christian_name}
						<span class="ml-2 text-sm text-gray-500">{member.christian_name}</span>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-medium {roleBadgeClasses[member.role]}"
				>
					{member.role}
				</span>
				{#if data.isAdmin && member.id !== data.currentUserId}
					<a
						href="/members/{member.id}/edit"
						class="rounded p-1 text-gray-500 hover:text-gray-200"
						title="Edit profile"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
							/>
						</svg>
					</a>
					<form method="POST" action="?/changeRole" use:enhance>
						<input type="hidden" name="user_id" value={member.id} />
						<select
							name="new_role"
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							value={member.role}
							class="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-300"
						>
							<option value="user">user</option>
							<option value="moderator">moderator</option>
							<option value="admin">admin</option>
						</select>
					</form>
				{/if}
			</div>
		</div>
	{/each}
</div>

{#if activeMembers.length === 0 && pendingMembers.length === 0}
	<p class="text-center text-gray-500">No members found.</p>
{/if}
