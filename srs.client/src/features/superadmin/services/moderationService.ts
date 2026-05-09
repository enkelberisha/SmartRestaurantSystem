import type { ModerationItem, ModerationStatus } from "@/features/superadmin/types";

export async function getModerationItems(): Promise<ModerationItem[]> {
    return [];
}

export async function updateModerationStatus(_ids: string[], _status: ModerationStatus): Promise<void> {
    void _ids;
    void _status;
    return;
}
