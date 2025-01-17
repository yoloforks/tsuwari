import type { TriggerKappagenRequest_Emote } from '@twir/grpc/generated/websockets/websockets';
import { useWebSocket } from '@vueuse/core';
import type { KappagenAnimations } from 'kappagen';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

import { type Buidler } from './use-kappagen-builder.js';

import type { TwirWebSocketEvent } from '@/api.js';
import { useKappagenSettings } from '@/composables/kappagen/use-kappagen-settings.js';
import { useMessageHelpers } from '@/composables/tmi/use-message-helpers.js';
import { generateSocketUrlWithParams } from '@/helpers.js';
import type {
	KappagenSpawnAnimatedEmotesFn,
	KappagenSpawnEmotesFn,
	KappagenSettings,
} from '@/types.js';

type Options = {
	kappagenCallback: KappagenSpawnAnimatedEmotesFn
	spawnCallback: KappagenSpawnEmotesFn
	emotesBuilder: Buidler
}

export const useKappagenOverlaySocket = (options: Options) => {
	const { makeMessageChunks } = useMessageHelpers();
	const kappagenSettingsStore = useKappagenSettings();
	const { settings } = storeToRefs(kappagenSettingsStore);

	const kappagenUrl = ref('');
	const { data, send, open, close } = useWebSocket(
		kappagenUrl,
		{
			immediate: false,
			autoReconnect: {
				delay: 500,
			},
			onConnected() {
				send(JSON.stringify({ eventName: 'getSettings' }));
			},
		},
	);

	function randomAnimation() {
		if (!settings.value) return;
		const enabledAnimations = settings.value.animations.filter(a => a.enabled);
		return enabledAnimations[Math.floor(Math.random() * enabledAnimations.length)];
	}

	watch(data, (d: string) => {
		const event = JSON.parse(d) as TwirWebSocketEvent;

		if (event.eventName === 'settings') {
			const data = event.data as KappagenSettings;
			kappagenSettingsStore.setSettings(data);
		}

		if (event.eventName === 'event') {
			if (!settings.value) return;

			const generatedEmotes = options.emotesBuilder.buildKappagenEmotes([]);

			const animation = randomAnimation();
			if (!animation) return;

			options.kappagenCallback(generatedEmotes, animation as KappagenAnimations);
		}

		if (event.eventName === 'kappagen') {
			if (!settings.value) return;

			const data = event.data as { text: string, emotes?: TriggerKappagenRequest_Emote[] };

			const chunks = makeMessageChunks(
				data.text,
				data.emotes?.reduce((acc, curr) => {
					acc[curr.id] = curr.positions;
					return acc;
				}, {} as Record<string, string[]>),
			);
			const emotesForKappagen = options.emotesBuilder.buildKappagenEmotes(chunks);

			const animation = randomAnimation();
			if (!animation) return;

			options.kappagenCallback(emotesForKappagen, animation as KappagenAnimations);
		}
	});

	function destroy() {
		close();
	}

	function connect(apiKey: string): void {
		const url = generateSocketUrlWithParams('/overlays/kappagen', {
			apiKey,
		});

		kappagenUrl.value = url;

		open();
	}

	return {
		connect,
		destroy,
	};
};
