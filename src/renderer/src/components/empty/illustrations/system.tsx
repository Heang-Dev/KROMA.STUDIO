import type { ReactNode } from "react";

import { Dot, Ground, line, Plus, Sparkle, tint } from "./parts";

/** What can go wrong between the browser and the server: errors, connection, access, limits, maintenance. */
export const systemScenes = {
	// A server rack with a warning sign — "server error (500)".
	"server-error": (
		<>
			<Ground />
			{[22, 44, 66].map((y) => (
				<g key={y}>
					<path d={`M42 ${y}h64v18H42z`} className={line} />
					<circle cx="52" cy={y + 9} r="2" className="fill-none stroke-foreground/50" />
					<path d={`M62 ${y + 9}h18`} className="stroke-foreground/30" />
				</g>
			))}
			<path d="M114 52l-20 34h40z" className="fill-card stroke-current" strokeWidth="2" />
			<path d="M114 52l-20 34h40z" {...tint} className="stroke-none" />
			<path d="M114 64v10" className="stroke-current" strokeWidth="2.5" />
			<circle cx="114" cy="80" r="1.25" className="fill-current stroke-none" />
			<Plus x={28} y={28} />
			<Dot x={128} y={26} />
		</>
	),
	// A cloud crossed out — "no connection / offline".
	offline: (
		<>
			<Ground />
			<path d="M52 76h56a15 15 0 0 0 1-30 22 22 0 0 0-42-5 16 16 0 0 0-15 35z" {...tint} className="stroke-foreground/70" strokeWidth="1.5" />
			<path d="M64 62h8M80 62h16" className="stroke-foreground/30" />
			<path d="M48 24l64 64" className="stroke-card" strokeWidth="6" />
			<path d="M48 24l64 64" className="stroke-current" strokeWidth="2.5" />
			<Plus x={30} y={34} />
			<Dot x={134} y={28} />
		</>
	),
	// A signpost and a question mark — "page not found (404)".
	"not-found": (
		<>
			<Ground rx={40} />
			<path d="M80 20v70" className="stroke-foreground/70" strokeWidth="3" />
			<path d="M50 26h44l8 8-8 8H50z" {...tint} className="stroke-foreground/70" />
			<path d="M110 48H66l-8 8 8 8h44z" className={line} />
			<path d="M58 34h24" className="stroke-current" strokeWidth="2" />
			<path d="M76 56h24" className="stroke-foreground/30" strokeWidth="2" />
			<path d="M118 22a6 6 0 1 1 6 6v4" className="fill-none stroke-current" strokeWidth="2" />
			<circle cx="124" cy="37" r="1.25" className="fill-current stroke-none" />
			<Plus x={32} y={40} />
			<Dot x={130} y={80} />
		</>
	),
	// A closed door with a no-entry sign — "no access (403)".
	forbidden: (
		<>
			<Ground rx={40} />
			<path d="M52 20h40v70H52z" className={line} />
			<path d="M58 26h28v64" className="fill-none stroke-foreground/30" />
			<circle cx="82" cy="58" r="2" className="fill-none stroke-foreground/70" />
			<circle cx="104" cy="66" r="15" className="fill-card stroke-current" strokeWidth="2.5" />
			<circle cx="104" cy="66" r="15" {...tint} className="stroke-none" />
			<path d="M94 76l20-20" className="stroke-current" strokeWidth="2.5" />
			<Plus x={32} y={30} />
			<Dot x={128} y={26} />
		</>
	),
	// An hourglass run out — "session expired (419) / link expired".
	expired: (
		<>
			<Ground rx={36} />
			<path d="M64 18c0 18 16 22 16 36s-16 18-16 36h32c0-18-16-22-16-36s16-18 16-36z" className={line} />
			<path d="M70 30h20c-3 8-10 11-10 16 0-5-7-8-10-16z" className="fill-current stroke-none" fillOpacity={0.3} />
			<path d="M68 88c2-8 8-12 12-12s10 4 12 12z" className="fill-current stroke-none" fillOpacity={0.5} />
			<path d="M80 56v18" className="stroke-current" strokeDasharray="2 2" />
			<path d="M60 18h40M60 90h40" className="stroke-foreground/70" strokeWidth="3" />
			<Plus x={36} y={32} />
			<Dot x={124} y={30} />
			<Sparkle x={122} y={72} />
		</>
	),
	// A gauge in the red — "too many requests (429)".
	"too-many": (
		<>
			<Ground />
			<path d="M40 76a40 40 0 0 1 80 0z" className="fill-card stroke-none" />
			<path d="M40 76a40 40 0 0 1 80 0z" {...tint} className="stroke-none" />
			<path d="M40 76a40 40 0 0 1 80 0" className="fill-none stroke-foreground/70" strokeWidth="2" />
			<path d="M106 54.1a34 34 0 0 1 8 21.9" className="fill-none stroke-current" strokeWidth="5" />
			<path d="M48 76h6M80 44v6M57.4 53.4l4.2 4.2" className="stroke-foreground/40" />
			<path d="M36 76h88" className="stroke-foreground/40" />
			<path d="M80 76l24-20" className="stroke-foreground/70" strokeWidth="2.5" />
			<circle cx="80" cy="76" r="4" className="fill-card stroke-foreground/70" />
			<Plus x={30} y={30} />
			<Dot x={132} y={30} />
		</>
	),
	// A traffic cone and a wrench — "down for maintenance (503)".
	maintenance: (
		<>
			<Ground rx={46} />
			<path d="M64 86l12-56h8l12 56z" className={line} />
			<path d="M71 56h18l2 10H69z" className="fill-current stroke-none" fillOpacity={0.35} />
			<path d="M54 86h52v4H54z" className="fill-card stroke-foreground/70" />
			<path d="M100 78l20-20" className="stroke-current" strokeWidth="4.5" />
			<path d="M129 50a7 7 0 1 1-6-5" className="fill-none stroke-current" strokeWidth="3" />
			<Plus x={30} y={30} />
			<Dot x={36} y={72} />
			<Sparkle x={128} y={24} />
		</>
	),
} satisfies Record<string, ReactNode>;
