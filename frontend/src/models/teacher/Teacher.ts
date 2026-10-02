import { EntityBase } from "../EntityBase";

export interface TeacherModel extends EntityBase {
    teacher_name_id: number;
    teacher_name: string;
    has_user_account?: boolean | null;
}
// export interface CreateClassModel extends EntityBase{
//     class_name: string;
// }
