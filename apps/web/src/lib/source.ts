import type { AppSource } from "@miku/backend";

// The concrete reference a source points at (the image, …) and the human name of
// its kind. Centralized so the node, the sidebar, and the create modal describe a
// source the same way — and so adding a source kind is one switch arm each.
export function sourceRef(source: AppSource): string {
	switch (source.type) {
		case "docker":
			return source.image;
	}
}

export function sourceKindLabel(source: AppSource): string {
	switch (source.type) {
		case "docker":
			return "Docker image";
	}
}
