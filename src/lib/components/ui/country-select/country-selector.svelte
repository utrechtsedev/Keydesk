<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import Check2 from '#lib/icons/check-2.svelte';
	import ChevronExpandY from '#lib/icons/chevron-expand-y.svelte';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { cn } from '#lib/utils.js';

	let { class: className = '', value = $bindable('') } = $props();

	let open = $state(false);

	const countries = [
		{
			continent: 'Africa',
			items: [
				{ flag: '🇩🇿', value: 'Algeria' },
				{ flag: '🇦🇴', value: 'Angola' },
				{ flag: '🇧🇯', value: 'Benin' },
				{ flag: '🇧🇼', value: 'Botswana' },
				{ flag: '🇧🇫', value: 'Burkina Faso' },
				{ flag: '🇧🇮', value: 'Burundi' },
				{ flag: '🇨🇲', value: 'Cameroon' },
				{ flag: '🇨🇻', value: 'Cape Verde' },
				{ flag: '🇨🇫', value: 'Central African Republic' },
				{ flag: '🇹🇩', value: 'Chad' },
				{ flag: '🇰🇲', value: 'Comoros' },
				{ flag: '🇨🇩', value: 'Congo (DRC)' },
				{ flag: '🇨🇬', value: 'Congo (Republic)' },
				{ flag: '🇨🇮', value: "Côte d'Ivoire" },
				{ flag: '🇩🇯', value: 'Djibouti' },
				{ flag: '🇪🇬', value: 'Egypt' },
				{ flag: '🇬🇶', value: 'Equatorial Guinea' },
				{ flag: '🇪🇷', value: 'Eritrea' },
				{ flag: '🇸🇿', value: 'Eswatini' },
				{ flag: '🇪🇹', value: 'Ethiopia' },
				{ flag: '🇬🇦', value: 'Gabon' },
				{ flag: '🇬🇲', value: 'Gambia' },
				{ flag: '🇬🇭', value: 'Ghana' },
				{ flag: '🇬🇳', value: 'Guinea' },
				{ flag: '🇬🇼', value: 'Guinea-Bissau' },
				{ flag: '🇰🇪', value: 'Kenya' },
				{ flag: '🇱🇸', value: 'Lesotho' },
				{ flag: '🇱🇷', value: 'Liberia' },
				{ flag: '🇱🇾', value: 'Libya' },
				{ flag: '🇲🇬', value: 'Madagascar' },
				{ flag: '🇲🇼', value: 'Malawi' },
				{ flag: '🇲🇱', value: 'Mali' },
				{ flag: '🇲🇷', value: 'Mauritania' },
				{ flag: '🇲🇺', value: 'Mauritius' },
				{ flag: '🇲🇦', value: 'Morocco' },
				{ flag: '🇲🇿', value: 'Mozambique' },
				{ flag: '🇳🇦', value: 'Namibia' },
				{ flag: '🇳🇪', value: 'Niger' },
				{ flag: '🇳🇬', value: 'Nigeria' },
				{ flag: '🇷🇼', value: 'Rwanda' },
				{ flag: '🇸🇹', value: 'São Tomé and Príncipe' },
				{ flag: '🇸🇳', value: 'Senegal' },
				{ flag: '🇸🇨', value: 'Seychelles' },
				{ flag: '🇸🇱', value: 'Sierra Leone' },
				{ flag: '🇸🇴', value: 'Somalia' },
				{ flag: '🇿🇦', value: 'South Africa' },
				{ flag: '🇸🇸', value: 'South Sudan' },
				{ flag: '🇸🇩', value: 'Sudan' },
				{ flag: '🇹🇿', value: 'Tanzania' },
				{ flag: '🇹🇬', value: 'Togo' },
				{ flag: '🇹🇳', value: 'Tunisia' },
				{ flag: '🇺🇬', value: 'Uganda' },
				{ flag: '🇿🇲', value: 'Zambia' },
				{ flag: '🇿🇼', value: 'Zimbabwe' }
			]
		},
		{
			continent: 'Asia',
			items: [
				{ flag: '🇦🇫', value: 'Afghanistan' },
				{ flag: '🇦🇲', value: 'Armenia' },
				{ flag: '🇦🇿', value: 'Azerbaijan' },
				{ flag: '🇧🇭', value: 'Bahrain' },
				{ flag: '🇧🇩', value: 'Bangladesh' },
				{ flag: '🇧🇹', value: 'Bhutan' },
				{ flag: '🇧🇳', value: 'Brunei' },
				{ flag: '🇰🇭', value: 'Cambodia' },
				{ flag: '🇨🇳', value: 'China' },
				{ flag: '🇬🇪', value: 'Georgia' },
				{ flag: '🇮🇳', value: 'India' },
				{ flag: '🇮🇩', value: 'Indonesia' },
				{ flag: '🇮🇷', value: 'Iran' },
				{ flag: '🇮🇶', value: 'Iraq' },
				{ flag: '🇮🇱', value: 'Israel' },
				{ flag: '🇯🇵', value: 'Japan' },
				{ flag: '🇯🇴', value: 'Jordan' },
				{ flag: '🇰🇿', value: 'Kazakhstan' },
				{ flag: '🇰🇼', value: 'Kuwait' },
				{ flag: '🇰🇬', value: 'Kyrgyzstan' },
				{ flag: '🇱🇦', value: 'Laos' },
				{ flag: '🇱🇧', value: 'Lebanon' },
				{ flag: '🇲🇾', value: 'Malaysia' },
				{ flag: '🇲🇻', value: 'Maldives' },
				{ flag: '🇲🇳', value: 'Mongolia' },
				{ flag: '🇲🇲', value: 'Myanmar' },
				{ flag: '🇳🇵', value: 'Nepal' },
				{ flag: '🇰🇵', value: 'North Korea' },
				{ flag: '🇴🇲', value: 'Oman' },
				{ flag: '🇵🇰', value: 'Pakistan' },
				{ flag: '🇵🇸', value: 'Palestine' },
				{ flag: '🇵🇭', value: 'Philippines' },
				{ flag: '🇶🇦', value: 'Qatar' },
				{ flag: '🇸🇦', value: 'Saudi Arabia' },
				{ flag: '🇸🇬', value: 'Singapore' },
				{ flag: '🇰🇷', value: 'South Korea' },
				{ flag: '🇱🇰', value: 'Sri Lanka' },
				{ flag: '🇸🇾', value: 'Syria' },
				{ flag: '🇹🇼', value: 'Taiwan' },
				{ flag: '🇹🇯', value: 'Tajikistan' },
				{ flag: '🇹🇭', value: 'Thailand' },
				{ flag: '🇹🇱', value: 'Timor-Leste' },
				{ flag: '🇹🇷', value: 'Turkey' },
				{ flag: '🇹🇲', value: 'Turkmenistan' },
				{ flag: '🇦🇪', value: 'United Arab Emirates' },
				{ flag: '🇺🇿', value: 'Uzbekistan' },
				{ flag: '🇻🇳', value: 'Vietnam' },
				{ flag: '🇾🇪', value: 'Yemen' }
			]
		},
		{
			continent: 'Europe',
			items: [
				{ flag: '🇦🇱', value: 'Albania' },
				{ flag: '🇦🇩', value: 'Andorra' },
				{ flag: '🇦🇹', value: 'Austria' },
				{ flag: '🇧🇾', value: 'Belarus' },
				{ flag: '🇧🇪', value: 'Belgium' },
				{ flag: '🇧🇦', value: 'Bosnia and Herzegovina' },
				{ flag: '🇧🇬', value: 'Bulgaria' },
				{ flag: '🇭🇷', value: 'Croatia' },
				{ flag: '🇨🇾', value: 'Cyprus' },
				{ flag: '🇨🇿', value: 'Czech Republic' },
				{ flag: '🇩🇰', value: 'Denmark' },
				{ flag: '🇪🇪', value: 'Estonia' },
				{ flag: '🇫🇮', value: 'Finland' },
				{ flag: '🇫🇷', value: 'France' },
				{ flag: '🇩🇪', value: 'Germany' },
				{ flag: '🇬🇷', value: 'Greece' },
				{ flag: '🇭🇺', value: 'Hungary' },
				{ flag: '🇮🇸', value: 'Iceland' },
				{ flag: '🇮🇪', value: 'Ireland' },
				{ flag: '🇮🇹', value: 'Italy' },
				{ flag: '🇽🇰', value: 'Kosovo' },
				{ flag: '🇱🇻', value: 'Latvia' },
				{ flag: '🇱🇮', value: 'Liechtenstein' },
				{ flag: '🇱🇹', value: 'Lithuania' },
				{ flag: '🇱🇺', value: 'Luxembourg' },
				{ flag: '🇲🇰', value: 'North Macedonia' },
				{ flag: '🇲🇹', value: 'Malta' },
				{ flag: '🇲🇩', value: 'Moldova' },
				{ flag: '🇲🇨', value: 'Monaco' },
				{ flag: '🇲🇪', value: 'Montenegro' },
				{ flag: '🇳🇱', value: 'Netherlands' },
				{ flag: '🇳🇴', value: 'Norway' },
				{ flag: '🇵🇱', value: 'Poland' },
				{ flag: '🇵🇹', value: 'Portugal' },
				{ flag: '🇷🇴', value: 'Romania' },
				{ flag: '🇷🇺', value: 'Russia' },
				{ flag: '🇸🇲', value: 'San Marino' },
				{ flag: '🇷🇸', value: 'Serbia' },
				{ flag: '🇸🇰', value: 'Slovakia' },
				{ flag: '🇸🇮', value: 'Slovenia' },
				{ flag: '🇪🇸', value: 'Spain' },
				{ flag: '🇸🇪', value: 'Sweden' },
				{ flag: '🇨🇭', value: 'Switzerland' },
				{ flag: '🇺🇦', value: 'Ukraine' },
				{ flag: '🇬🇧', value: 'United Kingdom' },
				{ flag: '🇻🇦', value: 'Vatican City' }
			]
		},
		{
			continent: 'North America',
			items: [
				{ flag: '🇦🇬', value: 'Antigua and Barbuda' },
				{ flag: '🇧🇸', value: 'Bahamas' },
				{ flag: '🇧🇧', value: 'Barbados' },
				{ flag: '🇧🇿', value: 'Belize' },
				{ flag: '🇨🇦', value: 'Canada' },
				{ flag: '🇨🇷', value: 'Costa Rica' },
				{ flag: '🇨🇺', value: 'Cuba' },
				{ flag: '🇩🇲', value: 'Dominica' },
				{ flag: '🇩🇴', value: 'Dominican Republic' },
				{ flag: '🇸🇻', value: 'El Salvador' },
				{ flag: '🇬🇩', value: 'Grenada' },
				{ flag: '🇬🇹', value: 'Guatemala' },
				{ flag: '🇭🇹', value: 'Haiti' },
				{ flag: '🇭🇳', value: 'Honduras' },
				{ flag: '🇯🇲', value: 'Jamaica' },
				{ flag: '🇲🇽', value: 'Mexico' },
				{ flag: '🇳🇮', value: 'Nicaragua' },
				{ flag: '🇵🇦', value: 'Panama' },
				{ flag: '🇰🇳', value: 'Saint Kitts and Nevis' },
				{ flag: '🇱🇨', value: 'Saint Lucia' },
				{ flag: '🇻🇨', value: 'Saint Vincent and the Grenadines' },
				{ flag: '🇹🇹', value: 'Trinidad and Tobago' },
				{ flag: '🇺🇸', value: 'United States' }
			]
		},
		{
			continent: 'South America',
			items: [
				{ flag: '🇦🇷', value: 'Argentina' },
				{ flag: '🇧🇴', value: 'Bolivia' },
				{ flag: '🇧🇷', value: 'Brazil' },
				{ flag: '🇨🇱', value: 'Chile' },
				{ flag: '🇨🇴', value: 'Colombia' },
				{ flag: '🇪🇨', value: 'Ecuador' },
				{ flag: '🇬🇾', value: 'Guyana' },
				{ flag: '🇵🇾', value: 'Paraguay' },
				{ flag: '🇵🇪', value: 'Peru' },
				{ flag: '🇸🇷', value: 'Suriname' },
				{ flag: '🇺🇾', value: 'Uruguay' },
				{ flag: '🇻🇪', value: 'Venezuela' }
			]
		},
		{
			continent: 'Oceania',
			items: [
				{ flag: '🇦🇺', value: 'Australia' },
				{ flag: '🇫🇯', value: 'Fiji' },
				{ flag: '🇰🇮', value: 'Kiribati' },
				{ flag: '🇲🇭', value: 'Marshall Islands' },
				{ flag: '🇫🇲', value: 'Micronesia' },
				{ flag: '🇳🇷', value: 'Nauru' },
				{ flag: '🇳🇿', value: 'New Zealand' },
				{ flag: '🇵🇼', value: 'Palau' },
				{ flag: '🇵🇬', value: 'Papua New Guinea' },
				{ flag: '🇼🇸', value: 'Samoa' },
				{ flag: '🇸🇧', value: 'Solomon Islands' },
				{ flag: '🇹🇴', value: 'Tonga' },
				{ flag: '🇹🇻', value: 'Tuvalu' },
				{ flag: '🇻🇺', value: 'Vanuatu' }
			]
		}
	] as const;

	const selectedCountry = $derived.by(() => {
		const items = countries.flatMap<(typeof countries)[number]['items'][number]>(
			(group) => group.items
		);
		return items.find((item) => item.value === value);
	});

	function handleSelect(currentValue: string) {
		value = currentValue;
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			{@const { class: propsClass, ...restProps } = props}
			<Button
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class={cn(
					'w-full justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20',
					className
				)}
				{...restProps}
			>
				{#if value && selectedCountry}
					<span class="flex min-w-0 items-center gap-2">
						<span class="text-lg leading-none">{selectedCountry.flag}</span>
						<span class="truncate">{value}</span>
					</span>
				{:else}
					<span class="text-muted-foreground">Select country</span>
				{/if}
				<ChevronExpandY class="shrink-0 text-muted-foreground/80" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-full min-w-(--bits-popover-anchor-width) p-0" align="start">
		<Command.Root>
			<Command.Input placeholder="Search country..." />
			<Command.List>
				<Command.Empty>No country found.</Command.Empty>
				{#each countries as group (group.continent)}
					<Command.Group heading={group.continent}>
						{#each group.items as country (country.value)}
							<Command.Item value={country.value} onSelect={() => handleSelect(country.value)}>
								<span class="text-lg leading-none">{country.flag}</span>
								{country.value}
								<Check2
									class={cn('ml-auto', value === country.value ? 'opacity-100' : 'opacity-0')}
								/>
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
