import { IAccountPayload } from "@/app/api/interfaces/account-payload.interface";
import { connectToDatabase } from "./database";

export const isAuthenticated = async (
  account: IAccountPayload,
  // action: ERoleAction, 
  // collectionName: ECollectionNames, 
) => {
  if (account.is_admin === true)
    return true;

  const result = false;

  try {
    connectToDatabase();

    // for (let i = 0; i < account.role_group_ids.length; i++) {
    //   const foundRoleGroup: IRoleGroup | null = await RoleGroupModel.findById(
    //     account.role_group_ids[i]
    //   );

    //   if ( foundRoleGroup ) {
    //     for (let j = 0; j < foundRoleGroup.role_ids.length; j++) {
    //       const foundRole: IRole | null = await RoleModel.findById(
    //         foundRoleGroup.role_ids[j]
    //       );

    //       if (
    //         foundRole?.action === action && 
    //         foundRole.collection_name === convertToMongoCollectionName(
    //           collectionName
    //         ).toLowerCase() 
    //       ) {
    //         result = true;
    //         break;
    //       }
    //     }
    //   }
    // }
  } catch (error) {
    console.error(`Error`, error);
  }

  return result;
}
