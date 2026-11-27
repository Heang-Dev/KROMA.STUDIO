import type { ReactNode } from "react";

import { Dot, Ground, line, Plus, Sparkle, Tinted, tint } from "./parts";

/** Everyday scenes: lists, pickers, people, structure, files and tools. */
export const generalScenes = {
	// An open, empty box with a cobweb — "nothing here yet".
	empty: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<path d="M54 46h52l4 10H50z" {...tint} className="stroke-foreground/70" />
			<path d="M80 51l-12 4m12-4l12 4m-12-4v5m-6-3.5l-2 3.5m14-3.5l2 3.5" className="stroke-muted-foreground/50" strokeWidth="0.75" />
			<path d="M50 56h60v36H50z" className={line} />
			<path d="M50 56L36 44l8-10 10 12z" {...tint} className="stroke-foreground/70" />
			<path d="M110 56l14-12-8-10-10 12z" {...tint} className="stroke-foreground/70" />
			<path d="M58 74h14v8H58z" className="fill-none stroke-current" />
			<path d="M88 76h14M92 80h10" className="stroke-foreground/40" />
			<path d="M30 24v10m-5-5h10" className="stroke-current" />
			<circle cx="132" cy="84" r="2" className="fill-none stroke-current" />
			<path d="M128 22l1.5 3.5L133 27l-3.5 1.5L128 32l-1.5-3.5L123 27l3.5-1.5z" className="fill-current stroke-none" fillOpacity={0.6} />
		</>
	),
	// A page under a magnifier — "nothing matches".
	search: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<path d="M50 20h40l12 12v58H50z" className={line} />
			<path d="M90 20v12h12" className="fill-none stroke-foreground/70" />
			<path d="M58 36h22M58 44h34M58 52h28M58 60h18" className="stroke-foreground/30" />
			<circle cx="100" cy="66" r="15" {...tint} className="stroke-current" strokeWidth="2" />
			<path d="M111 77l13 13" className="stroke-current" strokeWidth="4" />
			<path d="M95 66h10" className="stroke-current" />
			<path d="M34 30v8m-4-4h8" className="stroke-current" />
			<circle cx="130" cy="34" r="2" className="fill-none stroke-current" />
		</>
	),
	// A checklist with every row ticked — "all caught up".
	done: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<path d="M48 22h60v68H48z" className={line} />
			{[36, 52, 68].map((y) => (
				<g key={y}>
					<path d={`M56 ${y - 5}h10v10H56z`} {...tint} className="stroke-current" />
					<path d={`M58.5 ${y}l2 2 3.5-4`} className="fill-none stroke-current" strokeWidth="1.5" />
					<path d={`M72 ${y}h${y === 52 ? 22 : 28}`} className="stroke-foreground/30" />
				</g>
			))}
			<circle cx="110" cy="80" r="13" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M104 80l4 4 8-8" className="fill-none stroke-current" strokeWidth="2.5" />
			<path d="M34 34v8m-4-4h8" className="stroke-current" />
			<circle cx="126" cy="28" r="2" className="fill-none stroke-current" />
		</>
	),
	// Two people and an add badge — "no members / holders yet".
	people: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<circle cx="98" cy="38" r="9" {...tint} className="stroke-foreground/70" />
			<path d="M82 76c0-11 7-18 16-18s16 7 16 18z" {...tint} className="stroke-foreground/70" />
			<circle cx="70" cy="44" r="11" className={line} />
			<path d="M48 90c0-14 10-23 22-23s22 9 22 23z" className={line} />
			<circle cx="118" cy="80" r="9" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M118 76v8m-4-4h8" className="stroke-current" strokeWidth="1.75" />
			<path d="M34 30v8m-4-4h8" className="stroke-current" />
			<circle cx="128" cy="30" r="2" className="fill-none stroke-current" />
		</>
	),
	// A list with a clock — "no activity / history yet".
	activity: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<path d="M44 24h56v66H44z" className={line} />
			{[36, 48, 60, 72].map((y) => (
				<g key={y}>
					<circle cx="53" cy={y} r="2" className="fill-none stroke-current" />
					<path d={`M60 ${y}h${y === 60 ? 20 : 30}`} className="stroke-foreground/30" />
				</g>
			))}
			<circle cx="106" cy="68" r="16" {...tint} className="stroke-current" strokeWidth="2" />
			<path d="M106 60v8l6 4" className="fill-none stroke-current" strokeWidth="2" />
			<path d="M30 30v8m-4-4h8" className="stroke-current" />
			<circle cx="130" cy="34" r="2" className="fill-none stroke-current" />
		</>
	),
	// An org chart with an empty dashed slot — "no units / departments yet".
	structure: (
		<>
			<ellipse cx="80" cy="98" rx="44" ry="4" className="fill-muted" />
			<path d="M68 16h24v14H68z" {...tint} className="stroke-foreground/70" />
			<path d="M80 30v8M50 38h60M50 38v8M80 38v8M110 38v8M80 60v14" className="fill-none stroke-foreground/50" />
			<path d="M40 46h20v14H40zM70 46h20v14H70zM100 46h20v14h-20z" className={line} />
			<path d="M68 74h24v16H68z" {...tint} className="stroke-current" strokeDasharray="3 2.5" />
			<path d="M80 78v8m-4-4h8" className="stroke-current" />
			<path d="M28 24v8m-4-4h8" className="stroke-current" />
			<circle cx="132" cy="80" r="2" className="fill-none stroke-current" />
		</>
	),
	// A calendar page with one day ringed — "no terms / holidays / events yet".
	calendar: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<path d="M48 26h64v62H48z" className={line} />
			<path d="M48 26h64v14H48z" {...tint} className="stroke-foreground/70" />
			<path d="M62 20v12M98 20v12" className="stroke-foreground/70" strokeWidth="2" />
			{[50, 62, 74].flatMap((y) => [58, 70, 82, 94].map((x) => <path key={`${x}-${y}`} d={`M${x} ${y}h6`} className="stroke-foreground/30" strokeWidth="2" />))}
			<circle cx="85" cy="62" r="7" className="fill-none stroke-current" strokeWidth="1.75" />
			<path d="M32 34v8m-4-4h8" className="stroke-current" />
			<circle cx="128" cy="30" r="2" className="fill-none stroke-current" />
		</>
	),
	// A laptop and a phone — "no other devices / sessions".
	devices: (
		<>
			<ellipse cx="80" cy="96" rx="48" ry="5" className="fill-muted" />
			<path d="M42 30h60v40H42z" className={line} />
			<path d="M47 35h50v30H47z" {...tint} className="stroke-none" />
			<path d="M34 74h76l-5 8H39z" className={line} />
			<path d="M106 44h22v42h-22z" className="fill-card stroke-current" strokeWidth="1.75" />
			<path d="M113 80h8" className="stroke-current" />
			<path d="M28 24v8m-4-4h8" className="stroke-current" />
			<circle cx="132" cy="30" r="2" className="fill-none stroke-current" />
		</>
	),
	// A padlock — "nothing you may see / nothing granted".
	locked: (
		<>
			<ellipse cx="80" cy="96" rx="40" ry="5" className="fill-muted" />
			<path d="M66 50v-10a14 14 0 0 1 28 0v10" className="fill-none stroke-foreground/70" strokeWidth="2.5" />
			<path d="M58 50h44v38H58z" className={line} />
			<path d="M58 50h44v8H58z" {...tint} className="stroke-none" />
			<circle cx="80" cy="68" r="4" className="fill-current stroke-none" />
			<path d="M80 71v8" className="stroke-current" strokeWidth="2.5" />
			<path d="M36 30v8m-4-4h8" className="stroke-current" />
			<circle cx="124" cy="34" r="2" className="fill-none stroke-current" />
			<path d="M120 70l1.5 3.5L125 75l-3.5 1.5L120 80l-1.5-3.5L115 75l3.5-1.5z" className="fill-current stroke-none" fillOpacity={0.6} />
		</>
	),
	// A photo in front of a document — "no files / photos yet".
	media: (
		<>
			<ellipse cx="80" cy="96" rx="46" ry="5" className="fill-muted" />
			<path d="M84 16h30l8 8v52H84z" className={line} />
			<path d="M114 16v8h8" className="fill-none stroke-foreground/70" />
			<path d="M92 32h20M92 40h24M92 48h16" className="stroke-foreground/30" />
			<path d="M38 34h58v50H38z" className={line} />
			<path d="M43 39h48v32H43z" {...tint} className="stroke-none" />
			<path d="M43 71l14-16 10 10 8-7 16 13z" className="fill-current stroke-current" fillOpacity={0.3} />
			<circle cx="80" cy="48" r="4" className="fill-none stroke-current" />
			<path d="M28 22v8m-4-4h8" className="stroke-current" />
			<circle cx="134" cy="84" r="2" className="fill-none stroke-current" />
		</>
	),
	// A card under a dashed selection and a pointer — "nothing selected".
	select: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<path d="M36 18h76v60H36z" className="fill-none stroke-current" strokeDasharray="3 3" />
			<path d="M44 26h60v44H44z" className={line} />
			<path d="M50 32h20v14H50z" {...tint} className="stroke-none" />
			<path d="M76 34h22M76 40h16M50 54h48M50 60h36" className="stroke-foreground/30" />
			<path d="M100 60v24l6-6 5 10 4-2-5-10h8z" className="fill-card stroke-current" strokeWidth="1.5" />
			<path d="M24 34v8m-4-4h8" className="stroke-current" />
			<circle cx="132" cy="26" r="2" className="fill-none stroke-current" />
		</>
	),
	// A page with a warning badge — "it did not load / something went wrong".
	error: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<path d="M48 18h40l12 12v60H48z" className={line} />
			<path d="M88 18v12h12" className="fill-none stroke-foreground/70" />
			<path d="M56 36h22M56 44h30M56 52h14" className="stroke-foreground/30" />
			<path d="M58 62l6 5-4 4 6 6" className="fill-none stroke-foreground/40" />
			<circle cx="104" cy="70" r="14" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M104 63v8" className="stroke-current" strokeWidth="2.5" />
			<circle cx="104" cy="76.5" r="1.25" className="fill-current stroke-none" />
			<path d="M30 28v8m-4-4h8" className="stroke-current" />
			<circle cx="132" cy="32" r="2" className="fill-none stroke-current" />
		</>
	),
	// A sleeping bell — "no notifications".
	notifications: (
		<>
			<ellipse cx="80" cy="96" rx="40" ry="5" className="fill-muted" />
			<path d="M80 26v6" className="stroke-foreground/70" strokeWidth="2" />
			<path d="M62 74V54a18 18 0 0 1 36 0v20l6 8H56z" {...tint} className="stroke-foreground/70" />
			<path d="M73 82a7 7 0 0 0 14 0" className="fill-none stroke-foreground/70" />
			<path d="M68 52a12 12 0 0 1 8-10" className="fill-none stroke-card" strokeWidth="2" />
			<path d="M106 32h8l-8 8h8" className="fill-none stroke-current" strokeWidth="1.5" />
			<path d="M118 20h5l-5 5h5" className="fill-none stroke-current" />
			<path d="M34 34v8m-4-4h8" className="stroke-current" />
			<circle cx="128" cy="78" r="2" className="fill-none stroke-current" />
		</>
	),
	// A letter in an envelope — "no invitations / emails".
	mail: (
		<>
			<ellipse cx="80" cy="96" rx="46" ry="5" className="fill-muted" />
			<path d="M52 22h56v32H52z" className={line} />
			<path d="M60 30h28M60 37h36M60 44h20" className="stroke-foreground/30" />
			<path d="M40 40h80v48H40z" className={line} />
			<path d="M40 40l40 28 40-28" {...tint} className="stroke-foreground/70" />
			<path d="M40 88l28-22m52 22L92 66" className="fill-none stroke-foreground/40" />
			<path d="M28 26v8m-4-4h8" className="stroke-current" />
			<path d="M132 22l1.5 3.5L137 27l-3.5 1.5L132 32l-1.5-3.5L127 27l3.5-1.5z" className="fill-current stroke-none" fillOpacity={0.6} />
		</>
	),
	// Axes with dashed bars waiting for data — "no data yet".
	chart: (
		<>
			<ellipse cx="80" cy="96" rx="46" ry="4" className="fill-muted" />
			<path d="M44 40h76M44 58h76" className="stroke-foreground/15" strokeDasharray="2 3" />
			<path d="M54 68h12v20H54zM74 50h12v38H74zM94 60h12v28H94z" {...tint} className="stroke-current" strokeDasharray="3 2.5" />
			<path d="M44 20v68h78" className="fill-none stroke-foreground/70" strokeWidth="1.5" />
			<path d="M30 30v8m-4-4h8" className="stroke-current" />
			<circle cx="132" cy="28" r="2" className="fill-none stroke-current" />
		</>
	),
	// A key with an add badge — "no roles / permissions yet".
	key: (
		<>
			<ellipse cx="80" cy="96" rx="44" ry="5" className="fill-muted" />
			<circle cx="58" cy="52" r="16" {...tint} className="stroke-foreground/70" strokeWidth="2" />
			<circle cx="54" cy="52" r="5" className={line} />
			<path d="M74 52h44M106 52v9M114 52v6" className="fill-none stroke-foreground/70" strokeWidth="3" />
			<circle cx="112" cy="80" r="9" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M112 76v8m-4-4h8" className="stroke-current" strokeWidth="1.75" />
			<path d="M32 26v8m-4-4h8" className="stroke-current" />
			<circle cx="130" cy="28" r="2" className="fill-none stroke-current" />
		</>
	),
	// Dashboard tiles with one empty slot — "no widgets / nothing to show yet".
	widgets: (
		<>
			<ellipse cx="80" cy="96" rx="46" ry="4" className="fill-muted" />
			<path d="M40 20h38v28H40z" className={line} />
			<path d="M46 28h16M46 36h24" className="stroke-foreground/30" />
			<path d="M84 20h38v18H84z" {...tint} className="stroke-foreground/70" />
			<path d="M84 44h38v44H84z" className={line} />
			<path d="M93 80v-10M101 80v-18M109 80v-8M117 80v-14" className="stroke-current" strokeWidth="2.5" />
			<path d="M40 54h38v34H40z" {...tint} className="stroke-current" strokeDasharray="3 2.5" />
			<path d="M59 65v12m-6-6h12" className="stroke-current" strokeWidth="1.5" />
			<path d="M26 30v8m-4-4h8" className="stroke-current" />
			<circle cx="136" cy="80" r="2" className="fill-none stroke-current" />
		</>
	),
	// A folder with a page inside — "no documents / folders yet".
	folder: (
		<>
			<Ground rx={46} />
			<path d="M40 28h26l6 8h48v52H40z" {...tint} className="stroke-foreground/70" />
			<path d="M50 34h52v26H50z" className={line} />
			<path d="M56 42h30M56 49h22" className="stroke-foreground/30" />
			<path d="M40 50h80v38H40z" className={line} />
			<path d="M72 62h16" className="stroke-current" strokeWidth="2.5" />
			<Plus x={28} y={24} />
			<Dot x={134} y={30} />
		</>
	),
	// A dashed drop zone with an arrow up — "drop files here / nothing uploaded".
	upload: (
		<>
			<Ground rx={46} ry={4} />
			<path d="M38 20h84v58H38z" {...tint} className="stroke-current" strokeDasharray="4 3" />
			<path d="M80 62V34m-11 11l11-11 11 11" className="fill-none stroke-current" strokeWidth="2.5" />
			<path d="M64 70h32" className="stroke-foreground/30" />
			<path d="M104 64h18l6 6v20h-24z" className={line} />
			<path d="M122 64v6h6" className="fill-none stroke-foreground/70" />
			<Plus x={26} y={30} />
			<Dot x={26} y={84} />
		</>
	),
	// A funnel with a clear badge — "no rows for these filters".
	filter: (
		<>
			<Ground rx={40} />
			<circle cx="64" cy="14" r="3" className="fill-none stroke-current" />
			<circle cx="80" cy="10" r="3" className="fill-current stroke-current" fillOpacity={0.3} />
			<circle cx="96" cy="15" r="3" className="fill-none stroke-current" />
			<path d="M44 24h72l-27 32v24l-18 8V56z" {...tint} className="stroke-foreground/70" />
			<circle cx="112" cy="78" r="9" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M108.5 74.5l7 7m0-7l-7 7" className="stroke-current" strokeWidth="1.75" />
			<Plus x={30} y={40} />
			<Dot x={132} y={30} />
		</>
	),
	// An empty bin — "the trash is empty".
	trash: (
		<>
			<Ground rx={40} />
			<path d="M72 22h16v6H72z" className="fill-none stroke-foreground/70" />
			<path d="M50 28h60v7H50z" {...tint} className="stroke-foreground/70" />
			<path d="M56 35h48l-4 53H60z" className={line} />
			<path d="M70 46v32M80 46v32M90 46v32" className="stroke-foreground/30" />
			<Plus x={34} y={34} />
			<Dot x={126} y={30} />
			<Sparkle x={120} y={70} />
		</>
	),
	// A gear — "nothing to configure yet".
	settings: (
		<>
			<Ground rx={40} />
			{[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
				<path key={angle} d="M75 26h10v10H75z" transform={`rotate(${angle} 80 56)`} className={line} />
			))}
			<circle cx="80" cy="56" r="22" className="fill-card stroke-foreground/70" />
			<circle cx="80" cy="56" r="22" {...tint} className="stroke-none" />
			<circle cx="80" cy="56" r="9" className="fill-none stroke-current" strokeWidth="2.5" />
			<Plus x={30} y={30} />
			<Dot x={130} y={80} />
			<Sparkle x={126} y={28} />
		</>
	),
	// A sheet with an arrow — "nothing imported / exported yet".
	spreadsheet: (
		<>
			<Ground />
			<path d="M38 20h66v68H38z" className={line} />
			<path d="M38 20h66v12H38z" {...tint} className="stroke-foreground/70" />
			<path d="M38 46h66M38 60h66M38 74h66M60 32v56M82 32v56" className="stroke-foreground/20" />
			<path d="M61 47h20v12H61z" className="fill-current stroke-none" fillOpacity={0.25} />
			<circle cx="112" cy="70" r="14" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M105 70h14m-5-5l5 5-5 5" className="fill-none stroke-current" strokeWidth="2" />
			<Plus x={26} y={28} />
			<Dot x={132} y={26} />
		</>
	),
	// A database with a restore arrow — "no backups yet".
	backup: (
		<>
			<Ground rx={40} />
			<path d="M50 30v48c0 5 13 9 30 9s30-4 30-9V30" className={line} />
			<path d="M50 46c0 5 13 9 30 9s30-4 30-9M50 62c0 5 13 9 30 9s30-4 30-9" className="fill-none stroke-foreground/40" />
			<ellipse cx="80" cy="30" rx="30" ry="9" {...tint} className="stroke-foreground/70" />
			<circle cx="114" cy="78" r="11" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M109 80a5.5 5.5 0 1 0 1-6" className="fill-none stroke-current" strokeWidth="1.75" />
			<path d="M109 70v4.5h4.5" className="fill-none stroke-current" strokeWidth="1.75" />
			<Plus x={30} y={28} />
			<Dot x={132} y={28} />
		</>
	),
	// A shield with a tick — "secure / nothing granted here yet".
	shield: (
		<>
			<Ground rx={36} />
			<path d="M80 16l32 11v25c0 21-15 33-32 39-17-6-32-18-32-39V27z" {...tint} className="stroke-foreground/70" strokeWidth="1.5" />
			<path d="M80 24v59c-13-5-24-15-24-31V33z" className="fill-current stroke-none" fillOpacity={0.12} />
			<path d="M67 53l9 9 17-18" className="fill-none stroke-current" strokeWidth="3" />
			<Plus x={32} y={30} />
			<Dot x={128} y={32} />
			<Sparkle x={124} y={74} />
		</>
	),
	// A tray with an arrow in — "no requests / tasks waiting".
	inbox: (
		<>
			<Ground rx={46} />
			<path d="M42 56l12-26h52l12 26v32H42z" className={line} />
			<path d="M42 56h22l4 9h24l4-9h22" className="fill-none stroke-foreground/70" />
			<path d="M64 56l4 9h24l4-9" {...tint} className="stroke-none" />
			<path d="M80 14v26m-8-8l8 8 8-8" className="fill-none stroke-current" strokeWidth="2.5" />
			<Plus x={28} y={28} />
			<Dot x={134} y={32} />
		</>
	),
	// A folded map with a pin — "no campuses / locations yet".
	map: (
		<>
			<Ground rx={46} ry={4} />
			<path d="M34 40l30-8 32 8 30-8v50l-30 8-32-8-30 8z" className={line} />
			<path d="M64 32l32 8v50l-32-8z" {...tint} className="stroke-none" />
			<path d="M64 32v50M96 40v50" className="stroke-foreground/30" />
			<path d="M44 74c10-12 22 4 34-8s12-6 16-4" className="fill-none stroke-current" strokeDasharray="3 3" />
			<path d="M104 56c-8-10-13-16-13-23a13 13 0 0 1 26 0c0 7-5 13-13 23z" className="fill-card stroke-current" strokeWidth="2" />
			<circle cx="104" cy="33" r="4.5" {...tint} className="stroke-current" />
			<Plus x={26} y={26} />
			<Dot x={136} y={84} />
		</>
	),
	// Two speech bubbles — "no messages / comments yet".
	chat: (
		<>
			<Ground />
			<path d="M38 22h58v36H58l-12 10V58h-8z" className={line} />
			<path d="M46 32h40M46 40h30M46 48h20" className="stroke-foreground/30" />
			<Tinted d="M70 44h54v32h-8v10l-12-10H70z" className="stroke-current" />
			<circle cx="86" cy="60" r="2" className="fill-current stroke-none" />
			<circle cx="97" cy="60" r="2" className="fill-current stroke-none" />
			<circle cx="108" cy="60" r="2" className="fill-current stroke-none" />
			<Plus x={26} y={30} />
			<Dot x={134} y={28} />
		</>
	),
	// A megaphone — "no announcements yet".
	announcement: (
		<>
			<Ground rx={40} />
			<path d="M56 62l4 20h10l-4-20" className={line} />
			<path d="M46 46h16l34-18v52L62 62H46z" {...tint} className="stroke-foreground/70" />
			<path d="M46 46v16" className="stroke-foreground/70" strokeWidth="2" />
			<path d="M104 42c6 3 6 21 0 24" className="fill-none stroke-current" strokeWidth="2" />
			<path d="M112 34c11 6 11 34 0 40" className="fill-none stroke-current" />
			<Plus x={30} y={30} />
			<Dot x={130} y={84} />
			<Sparkle x={124} y={22} />
		</>
	),
	// A page with a pie and bars — "no reports yet".
	report: (
		<>
			<Ground />
			<path d="M44 18h52l12 12v60H44z" className={line} />
			<path d="M96 18v12h12" className="fill-none stroke-foreground/70" />
			<circle cx="66" cy="44" r="12" {...tint} className="stroke-foreground/70" />
			<path d="M66 32v12h12a12 12 0 0 0-12-12z" className="fill-current stroke-current" fillOpacity={0.5} />
			<path d="M84 38h14M84 46h10" className="stroke-foreground/30" />
			<path d="M54 82v-8M64 82v-14M74 82v-10M84 82v-18M94 82v-6" className="stroke-current" strokeWidth="3" />
			<Plus x={30} y={28} />
			<Dot x={128} y={32} />
		</>
	),
} satisfies Record<string, ReactNode>;
