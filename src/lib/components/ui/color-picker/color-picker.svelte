<script lang="ts">
	import { cn } from '$lib/utils';
	import { Input } from '$lib/components/ui/input';

	let {
		value = $bindable('#000000'),
		class: className,
		allowOpacity = false
	}: {
		value?: string;
		class?: string;
		allowOpacity?: boolean;
	} = $props();

	let h = $state(0);
	let s = $state(0);
	let v = $state(0);
	let a = $state(1);
	let isDragging = $state(false);

	let sbRef: HTMLDivElement | undefined = $state();
	let hueRef: HTMLDivElement | undefined = $state();
	let alphaRef: HTMLDivElement | undefined = $state();

	const hueGradient =
		'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';

	$effect(() => {
		if (!isDragging) {
			const parsed = parseColor(value);
			if (parsed) {
				const currentStr = hsvToHex(h, s, v, a);
				const parsedStr = hsvToHex(parsed.h, parsed.s, parsed.v, parsed.a);

				if (currentStr !== parsedStr) {
					h = parsed.h;
					s = parsed.s;
					v = parsed.v;
					a = parsed.a;
				}
			}
		}
	});

	function updateExternal() {
		value = hsvToHex(h, s, v, a);
	}

	function parseColor(str: string) {
		str = str.trim().toLowerCase();
		if (str.startsWith('#')) {
			let hex = str.replace('#', '');
			let r = 0,
				g = 0,
				b = 0,
				alpha = 1;
			if (hex.length === 3) {
				r = parseInt(hex[0] + hex[0], 16);
				g = parseInt(hex[1] + hex[1], 16);
				b = parseInt(hex[2] + hex[2], 16);
			} else if (hex.length === 6) {
				r = parseInt(hex.substring(0, 2), 16);
				g = parseInt(hex.substring(2, 4), 16);
				b = parseInt(hex.substring(4, 6), 16);
			} else if (hex.length === 8) {
				r = parseInt(hex.substring(0, 2), 16);
				g = parseInt(hex.substring(2, 4), 16);
				b = parseInt(hex.substring(4, 6), 16);
				alpha = parseInt(hex.substring(6, 8), 16) / 255;
			}
			return { ...rgbToHsv(r, g, b), a: alpha };
		}
		return null;
	}

	function rgbToHsv(r: number, g: number, b: number) {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		let h = 0,
			s = 0,
			v = max;
		const d = max - min;
		s = max === 0 ? 0 : d / max;
		if (max !== min) {
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h /= 6;
		}
		return { h: h * 360, s: s * 100, v: v * 100 };
	}

	function hsvToRgb(h: number, s: number, v: number) {
		let sNorm = s / 100,
			vNorm = v / 100;
		let r = 0,
			g = 0,
			b = 0;
		const i = Math.floor(h / 60),
			f = h / 60 - i,
			p = vNorm * (1 - sNorm),
			q = vNorm * (1 - f * sNorm),
			t = vNorm * (1 - (1 - f) * sNorm);
		switch (i % 6) {
			case 0:
				r = vNorm;
				g = t;
				b = p;
				break;
			case 1:
				r = q;
				g = vNorm;
				b = p;
				break;
			case 2:
				r = p;
				g = vNorm;
				b = t;
				break;
			case 3:
				r = p;
				g = q;
				b = vNorm;
				break;
			case 4:
				r = t;
				g = p;
				b = vNorm;
				break;
			case 5:
				r = vNorm;
				g = p;
				b = q;
				break;
		}
		return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
	}

	function hsvToHex(h: number, s: number, v: number, a: number) {
		const { r, g, b } = hsvToRgb(h, s, v);
		const toHex = (x: number) => {
			const hex = x.toString(16);
			return hex.length === 1 ? '0' + hex : hex;
		};
		let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
		if (allowOpacity && a < 1) hex += toHex(Math.round(a * 255));
		return hex.toUpperCase();
	}

	function handleDragStart(e: MouseEvent | TouchEvent, fn: (e: MouseEvent | TouchEvent) => void) {
		isDragging = true;
		fn(e);
		const move = (e: MouseEvent | TouchEvent) => fn(e);
		const stop = () => {
			isDragging = false;
			window.removeEventListener('mousemove', move);
			window.removeEventListener('touchmove', move);
			window.removeEventListener('mouseup', stop);
			window.removeEventListener('touchend', stop);
		};
		window.addEventListener('mousemove', move);
		window.addEventListener('touchmove', move);
		window.addEventListener('mouseup', stop);
		window.addEventListener('touchend', stop);
	}

	function handleSbChange(e: MouseEvent | TouchEvent) {
		if (!sbRef) return;
		const rect = sbRef.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
		s = x * 100;
		v = (1 - y) * 100;
		updateExternal();
	}

	function handleHueChange(e: MouseEvent | TouchEvent) {
		if (!hueRef) return;
		const rect = hueRef.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		h = x * 360;
		updateExternal();
	}

	function handleAlphaChange(e: MouseEvent | TouchEvent) {
		if (!alphaRef) return;
		const rect = alphaRef.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		a = Math.round(x * 100) / 100;
		updateExternal();
	}

	function handleAlphaInput(e: Event & { currentTarget: HTMLInputElement }) {
		let val = parseInt(e.currentTarget.value);
		if (isNaN(val)) return;
		val = Math.max(0, Math.min(100, val));
		a = val / 100;
		updateExternal();
	}
</script>

<div class={cn('flex w-87.5 flex-col gap-3 rounded-lg border bg-popover p-3 shadow-sm', className)}>
	<div
		bind:this={sbRef}
		class="relative h-56 w-full cursor-crosshair touch-none overflow-hidden rounded-md shadow-sm"
		style:background-color={`hsl(${h}, 100%, 50%)`}
		role="slider"
		aria-label="Saturation and Brightness"
		aria-valuenow={s}
		tabindex="0"
		onmousedown={(e) => handleDragStart(e, handleSbChange)}
		ontouchstart={(e) => handleDragStart(e, handleSbChange)}
	>
		<div
			class="pointer-events-none absolute inset-0 bg-linear-to-r from-white to-transparent"
		></div>
		<div
			class="pointer-events-none absolute inset-0 bg-linear-to-t from-black to-transparent"
		></div>
		<div
			class="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/20"
			style:left={`${s}%`}
			style:top={`${100 - v}%`}
		></div>
	</div>

	<div class="flex items-center gap-3">
		<div
			class="relative mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] shadow-sm"
		>
			<div class="absolute inset-0" style:background-color={hsvToHex(h, s, v, a)}></div>
		</div>

		<div class="flex flex-1 flex-col justify-center gap-3">
			<div
				bind:this={hueRef}
				class="relative h-3 w-full cursor-pointer touch-none rounded-full shadow-sm ring-1 ring-black/5"
				style:background={hueGradient}
				role="slider"
				aria-valuenow={h}
				tabindex="0"
				onmousedown={(e) => handleDragStart(e, handleHueChange)}
				ontouchstart={(e) => handleDragStart(e, handleHueChange)}
			>
				<div
					class="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
					style:left={`${(h / 360) * 100}%`}
				></div>
			</div>

			{#if allowOpacity}
				<div
					bind:this={alphaRef}
					class="relative h-3 w-full cursor-pointer touch-none rounded-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] shadow-sm ring-1 ring-black/5"
					role="slider"
					aria-valuenow={a}
					tabindex="0"
					onmousedown={(e) => handleDragStart(e, handleAlphaChange)}
					ontouchstart={(e) => handleDragStart(e, handleAlphaChange)}
				>
					<div
						class="absolute inset-0 rounded-full"
						style:background={`linear-gradient(to right, transparent, ${hsvToHex(h, s, v, 1)})`}
					></div>
					<div
						class="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
						style:left={`${a * 100}%`}
					></div>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex gap-2">
		<Input
			class="h-9 flex-1 font-mono text-xs uppercase"
			{value}
			oninput={(e) => {
				const parsed = parseColor(e.currentTarget.value);
				if (parsed) {
					h = parsed.h;
					s = parsed.s;
					v = parsed.v;
					a = parsed.a;
					updateExternal();
				}
			}}
		/>

		{#if allowOpacity}
			<Input
				class="h-9 w-20 text-right font-mono text-xs"
				value={Math.round(a * 100) + '%'}
				oninput={handleAlphaInput}
				maxlength={3}
			/>
		{/if}
	</div>
</div>
