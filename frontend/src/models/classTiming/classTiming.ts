import { EntityBase } from "../EntityBase";

export interface ClassTiming extends EntityBase {
    attendance_time_id: number;
    attendance_time: string;
}

export interface CreateTiming extends EntityBase {
    attendance_time: string;
}

