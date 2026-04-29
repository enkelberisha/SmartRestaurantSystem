import type { ModerationItem, ModerationStatus } from "@/superadmin/types";

export async function getModerationItems(): Promise<ModerationItem[]> {
    return [];
}

export async function updateModerationStatus(_ids: string[], _status: ModerationStatus): Promise<void> {
    return;
}
