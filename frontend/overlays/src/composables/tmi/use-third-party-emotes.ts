import { useIntervalFn } from '@vueuse/core';
import { watch, type Ref, onUnmounted } from 'vue';

import { useBetterTv } from './use-bettertv.js';
import { useFrankerFaceZ } from './use-ffz.js';
import { useSevenTv } from './use-seven-tv.js';

export type ThirdPartyEmotesOptions = {
	channelName?: string;
	channelId?: string;
	sevenTv?: boolean;
	bttv?: boolean;
	ffz?: boolean;
};

export function useThirdPartyEmotes(options: Ref<ThirdPartyEmotesOptions>) {
	const { fetchSevenTvEmotes, connect: connectSevenTv, destroy: destroySevenTv } = useSevenTv();
	const { fetchBttvEmotes } = useBetterTv();
	const { fetchFrankerFaceZEmotes } = useFrankerFaceZ();

	function fetchBetterTv() {
		if (!options.value.channelId) return;
		fetchBttvEmotes(options.value.channelId);
	}

	function fetchFrankerFaceZ() {
		if (!options.value.channelId) return;
		fetchFrankerFaceZEmotes(options.value.channelId);
	}

	const { pause: bttvPause, resume: bttvResume } = useIntervalFn(fetchBetterTv, 60 * 1000);
	const { pause: ffzPause, resume: ffzResume } = useIntervalFn(fetchFrankerFaceZ, 120 * 1000);

	watch(() => options.value, async (options) => {
		if (!options.channelId) return;

		if (options.sevenTv) {
			connectSevenTv(options.channelId);
			await fetchSevenTvEmotes();
		}

		if (options.bttv) {
			fetchBetterTv();
			bttvResume();
		} else {
			bttvPause();
		}

		if (options.ffz) {
			fetchFrankerFaceZ();
			ffzResume();
		} else {
			ffzPause();
		}
	});

	onUnmounted(() => {
		bttvPause();
		ffzPause();
		destroySevenTv();
	});
}
