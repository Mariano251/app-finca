import axios from "axios";

/** true si el error es de conectividad (axios sin `response`) — a diferencia de un error real
 *  del server (validación, 404, 500), que sí trae `response` y hay que dejar pasar tal cual. */
export function isConnectivityError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
