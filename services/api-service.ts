import { ROOT } from "@/constants/root.constant";
import { ECollectionNames } from "@/enums";
import { nameToHyphenAndLowercase } from "@/utils/name-to-hyphen-and-lowercase";

const getCollectionCount = async (
  collectionName: ECollectionNames,
): Promise<Response> =>
  await fetch(`${ROOT}/${nameToHyphenAndLowercase(collectionName)}/count`);

const getCollections = async (
  collectionName: ECollectionNames,
): Promise<Response> =>
  await fetch(`${ROOT}/${nameToHyphenAndLowercase(collectionName)}`);

const getBusinessNames = async (): Promise<Response> =>
  await fetch(`${ROOT}/business/names`);

const getProductsBySupplier = async (supplierId: string): Promise<Response> =>
  await fetch(`${ROOT}/product/supplier/${supplierId}`);

const fetchCollection = async <T>(endpoint: string): Promise<Response> =>
  await fetch(`${ROOT}/${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

const addCollection = async <T>(
  collection: T, collectionName: ECollectionNames,
): Promise<Response> =>
  await fetch(`${ROOT}/${nameToHyphenAndLowercase(collectionName)}`, {
    method: `POST`,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(collection),
  });

const updateCollectionById = async <T>(
  collection: T, collectionId: string, collectionName: ECollectionNames,
): Promise<Response> =>
  await fetch(`${ROOT}/${nameToHyphenAndLowercase(collectionName)}/${collectionId}`, {
    method: `PATCH`,
    body: JSON.stringify(collection),
  });

const updateOrderStatus = async (
  orderId: string, status: string
): Promise<Response> =>
  await fetch(`${ROOT}/order-form/${orderId}/status`, {
    method: `PATCH`,
    body: JSON.stringify({ status }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

const deleteCollections = async (
  collectionName: ECollectionNames,
): Promise<Response> =>
  await fetch(`${ROOT}/${nameToHyphenAndLowercase(collectionName)}`, {
    method: `DELETE`,
  });

const getCollectionById = async (
  collectionId: string, collectionName: ECollectionNames,
): Promise<Response> =>
  await fetch(
    `${ROOT}/${nameToHyphenAndLowercase(collectionName)}/${collectionId}`
  );

const deleteCollectionById = async (
  collectionId: string, collectionName: ECollectionNames,
): Promise<Response> =>
  await fetch(
    `${ROOT}/${nameToHyphenAndLowercase(collectionName)}/${collectionId}`,
    { method: `DELETE`, }
  );

export {
  getCollectionCount,
  getCollections,
  addCollection,
  deleteCollections,
  getCollectionById,
  deleteCollectionById,
  updateCollectionById,
  fetchCollection,
  updateOrderStatus,
  getBusinessNames,
  getProductsBySupplier,
}
