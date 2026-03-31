export interface EntityBase {
    created_at: Date;
    updated_at: Date;
    
//   modifiedDate: Date;

//   createdBy: string;
//   modifiedBy: string;

//   rowVersion: string;
}

export function GetActionDetail(Data: EntityBase, DataType: string) {
  try {
    switch (DataType) {
      case "create":
        Data.created_at = new Date();
        Data.updated_at = new Date();
        break;
      case "update":
        Data.updated_at = new Date();
        break;
    }

    return Data;
  } catch (error) {
    console.log(error);
  }
}
