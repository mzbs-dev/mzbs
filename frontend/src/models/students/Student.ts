import { EntityBase } from "../EntityBase";

export interface StudentModel extends EntityBase {
  student_id: string;

  student_name: string;

  student_date_of_birth: string;

  student_age: string;

  student_gender: string;

  student_education: string;

  student_class_name: string;

  student_city: string;

  student_address: string;

  father_name: string;

  father_occupation: string;

  father_cnic: string;

  father_cast_name: string;

  father_contact: string;

  created_at: Date;
}

export interface CreateStudent {
  student_name: string;
  student_date_of_birth: string;
  student_age: string;
  student_education: string;
  class_name: string;
  student_gender: string;
  student_city: string;
  student_address: string;
  father_name: string;
  father_occupation: string;
  father_cnic: string;
  father_cast_name: string;
  father_contact: string;
}
